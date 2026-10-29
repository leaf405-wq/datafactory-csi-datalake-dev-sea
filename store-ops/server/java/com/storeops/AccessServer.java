package com.storeops;

import com.healthmarketscience.jackcess.Column;
import com.healthmarketscience.jackcess.ColumnBuilder;
import com.healthmarketscience.jackcess.Cursor;
import com.healthmarketscience.jackcess.CursorBuilder;
import com.healthmarketscience.jackcess.DataType;
import com.healthmarketscience.jackcess.Database;
import com.healthmarketscience.jackcess.DatabaseBuilder;
import com.healthmarketscience.jackcess.Row;
import com.healthmarketscience.jackcess.Table;
import com.healthmarketscience.jackcess.TableBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * Local Microsoft Access database (.accdb, Access 2016 format) used as the system of record.
 * Node talks to this process over localhost JSON.
 */
public final class AccessServer {
    private static Database db;

    private record Col(String name, DataType type) {}

    private static final Map<String, List<Col>> SCHEMA = new LinkedHashMap<>();

    static {
        table("stores",
                text("id"), text("brand"), text("code"), text("name"), text("region"), text("city"),
                text("mall_name"), text("grade"), dbl("area_sqm"), dbl("selling_area"), dbl("gfa"), dbl("gla"),
                text("floor"), text("status"), text("keep_decision"), text("lease_end"), text("lifecycle_start"),
                text("landlord"), text("rank"), text("action_plan"));
        table("contracts",
                text("id"), text("store_id"), text("contract_no"), text("status"), memo("raw_text"), text("model"),
                dbl("fixed_rent"), dbl("rate"), dbl("min_sales"), dbl("min_rent"), dbl("overage_rate"), dbl("cap_amount"),
                memo("tiers_json"), text("rent_free_start"), text("rent_free_end"), num("waive_property"),
                dbl("property_fee"), dbl("promo_fee"), dbl("utility_fee"), dbl("vat_rate"),
                text("start_date"), text("end_date"), num("version"), dbl("confidence"),
                text("confirmed_by"), text("created_at"));
        table("contract_fields",
                text("id"), text("contract_id"), text("field_name"), memo("field_value"), dbl("confidence"), num("needs_review"));
        table("monthly_inputs",
                text("id"), text("store_id"), num("year"), num("month"), memo("activity_note"),
                dbl("temp_rate"), dbl("subsidy"), text("created_by"), text("created_at"));
        table("sales_monthly",
                text("id"), text("store_id"), num("year"), num("month"), dbl("sales"), text("source"));
        table("rent_bills",
                text("id"), text("store_id"), num("year"), num("month"), text("model"), num("in_rent_free"),
                dbl("sales"), dbl("rate"), dbl("fixed_rent"), dbl("commission_rent"), dbl("base_rent"),
                dbl("surcharge"), dbl("property_fee"), dbl("promo_fee"), dbl("utility_fee"),
                dbl("subsidy"), dbl("net_before_vat"), dbl("vat"), dbl("payable"),
                dbl("rent_to_sales"), memo("trace_json"), text("created_at"));
        table("alerts",
                text("id"), text("store_id"), num("year"), num("month"), text("level"), text("dimension"),
                memo("message"), text("status"));
        table("mall_bills",
                text("id"), text("store_id"), num("year"), num("month"),
                dbl("base_rent"), dbl("commission_rent"), dbl("property_fee"), dbl("promo_fee"),
                dbl("utility_fee"), dbl("card_fee"), dbl("advance_fee"), dbl("total"), memo("note"));
        table("reconciliations",
                text("id"), text("store_id"), num("year"), num("month"),
                dbl("system_total"), dbl("mall_total"), dbl("diff_amount"), text("status"),
                text("reason"), memo("letter"), text("resolution"), memo("lines_json"));
        table("payment_requests",
                text("id"), text("store_id"), num("year"), num("month"), dbl("amount"), text("status"), text("created_at"));
        table("journey",
                text("id"), text("store_id"), num("year"), num("month"), num("step"), text("updated_at"));
        table("audit_log",
                text("id"), text("actor"), text("role"), text("action"), memo("detail"), text("created_at"));
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: AccessServer <accdb path> <port>");
            System.exit(2);
        }
        Path file = Path.of(args[0]);
        int port = Integer.parseInt(args[1]);
        Files.createDirectories(file.getParent());
        open(file);

        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.setExecutor(Executors.newSingleThreadExecutor());
        server.createContext("/health", AccessServer::health);
        server.createContext("/db", AccessServer::handle);
        server.start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                if (db != null) db.close();
            } catch (IOException ignored) {
                // process is already exiting
            }
        }));
        System.out.println("ACCESS_READY " + file.toAbsolutePath() + " port " + port);
    }

    private static void open(Path file) throws IOException {
        if (Files.exists(file) && Files.size(file) > 0) {
            db = DatabaseBuilder.open(file.toFile());
        } else {
            if (Files.exists(file)) Files.delete(file);
            db = DatabaseBuilder.create(Database.FileFormat.V2016, file.toFile());
        }
        for (var entry : SCHEMA.entrySet()) {
            if (db.getTable(entry.getKey()) == null) {
                TableBuilder builder = new TableBuilder(entry.getKey());
                for (Col col : entry.getValue()) {
                    ColumnBuilder column = new ColumnBuilder(col.name(), col.type());
                    if (col.type() == DataType.TEXT) column.setLength(255);
                    builder.addColumn(column);
                }
                builder.setPrimaryKey("id");
                builder.toTable(db);
            }
        }
    }

    private static void health(HttpExchange exchange) throws IOException {
        write(exchange, 200, new JSONObject().put("ok", true).put("file", db.getFile().getAbsolutePath()));
    }

    private static void handle(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            write(exchange, 405, new JSONObject().put("error", "POST only"));
            return;
        }
        JSONObject body = new JSONObject(read(exchange));
        String op = body.optString("op");
        try {
            JSONObject result = switch (op) {
                case "all" -> new JSONObject().put("rows", rows(table(body), null));
                case "find" -> new JSONObject().put("rows", rows(table(body), body.optJSONObject("where")));
                case "insert" -> insert(table(body), body.getJSONObject("row"));
                case "update" -> update(table(body), body.getString("id"), body.getJSONObject("patch"));
                case "delete" -> delete(table(body), body.getString("id"));
                default -> throw new IllegalArgumentException("未知操作: " + op);
            };
            write(exchange, 200, result);
        } catch (Exception ex) {
            write(exchange, 400, new JSONObject().put("error", ex.getMessage() == null ? ex.toString() : ex.getMessage()));
        }
    }

    private static Table table(JSONObject body) throws IOException {
        String name = body.getString("table");
        if (!SCHEMA.containsKey(name)) throw new IllegalArgumentException("未知表: " + name);
        Table table = db.getTable(name);
        if (table == null) throw new IllegalArgumentException("表不存在: " + name);
        return table;
    }

    private static JSONObject insert(Table table, JSONObject row) throws IOException {
        Map<String, Object> map = convertRow(table, row);
        if (!map.containsKey("id") || map.get("id") == null) {
            throw new IllegalArgumentException("缺少 id");
        }
        table.addRowFromMap(map);
        return new JSONObject().put("ok", true);
    }

    private static JSONObject update(Table table, String id, JSONObject patch) throws IOException {
        Cursor cursor = CursorBuilder.createCursor(table);
        if (!cursor.findFirstRow(table.getColumn("id"), id)) {
            throw new IllegalArgumentException("找不到记录 " + id);
        }
        Row current = cursor.getCurrentRow();
        Map<String, Object> map = new LinkedHashMap<>();
        for (Column column : table.getColumns()) {
            map.put(column.getName(), current.get(column.getName()));
        }
        map.putAll(convertRow(table, patch));
        map.put("id", id);
        cursor.updateCurrentRowFromMap(map);
        return new JSONObject().put("ok", true);
    }

    private static JSONObject delete(Table table, String id) throws IOException {
        Cursor cursor = CursorBuilder.createCursor(table);
        if (!cursor.findFirstRow(table.getColumn("id"), id)) {
            throw new IllegalArgumentException("找不到记录 " + id);
        }
        cursor.deleteCurrentRow();
        return new JSONObject().put("ok", true);
    }

    private static JSONArray rows(Table table, JSONObject where) throws IOException {
        JSONArray array = new JSONArray();
        for (Row row : table) {
            if (where != null && !matches(table, row, where)) continue;
            JSONObject obj = new JSONObject();
            for (Column column : table.getColumns()) {
                Object value = row.get(column.getName());
                if (value == null) obj.put(column.getName(), JSONObject.NULL);
                else if (value instanceof Number number) obj.put(column.getName(), number.doubleValue() == number.longValue() && column.getType() == DataType.LONG
                        ? number.longValue()
                        : (column.getType() == DataType.LONG ? number.longValue() : number.doubleValue()));
                else obj.put(column.getName(), String.valueOf(value));
            }
            array.put(obj);
        }
        return array;
    }

    private static boolean matches(Table table, Row row, JSONObject where) {
        for (String key : where.keySet()) {
            Object expected = convertValue(table, key, where.get(key));
            Object actual = row.get(key);
            if (expected == null) {
                if (actual != null) return false;
                continue;
            }
            if (actual instanceof Number && expected instanceof Number) {
                if (Math.abs(((Number) actual).doubleValue() - ((Number) expected).doubleValue()) > 0.000001) return false;
            } else if (!expected.toString().equals(actual == null ? null : actual.toString())) {
                return false;
            }
        }
        return true;
    }

    private static Map<String, Object> convertRow(Table table, JSONObject row) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (String key : row.keySet()) {
            if (table.getColumn(key) == null) continue;
            map.put(key, convertValue(table, key, row.get(key)));
        }
        return map;
    }

    private static Object convertValue(Table table, String key, Object raw) {
        if (raw == null || raw == JSONObject.NULL) return null;
        DataType type = table.getColumn(key).getType();
        if (type == DataType.MEMO || type == DataType.TEXT) return String.valueOf(raw);
        if (type == DataType.LONG) {
            if (raw instanceof Number number) return number.intValue();
            return Integer.parseInt(String.valueOf(raw));
        }
        if (type == DataType.DOUBLE) {
            if (raw instanceof Number number) return number.doubleValue();
            return Double.parseDouble(String.valueOf(raw));
        }
        return raw;
    }

    private static void write(HttpExchange exchange, int status, JSONObject body) throws IOException {
        byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    private static String read(HttpExchange exchange) throws IOException {
        try (InputStream in = exchange.getRequestBody()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static void table(String name, Col... cols) {
        SCHEMA.put(name, List.of(cols));
    }

    private static Col text(String name) { return new Col(name, DataType.TEXT); }
    private static Col memo(String name) { return new Col(name, DataType.MEMO); }
    private static Col dbl(String name) { return new Col(name, DataType.DOUBLE); }
    private static Col num(String name) { return new Col(name, DataType.LONG); }
}
