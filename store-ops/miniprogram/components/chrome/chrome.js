const view = require("../../utils/view");

Component({
  properties: {
    active: String,
    headline: String,
    roles: Array,
    pages: Array,
    chips: Array,
    query: String,
    showFilter: Boolean,
    showMonths: Boolean,
    countText: String,
    photoUrl: String,
    photoName: String,
    photoMeta: String,
    filterPlaceholder: { type: String, value: "按区域、城市、店名、商场、电话筛选" },
  },
  data: { pageList: view.PAGES },
  methods: {
    onRole(event) {
      this.triggerEvent("role", { id: event.currentTarget.dataset.id });
    },
    onNav(event) {
      this.triggerEvent("nav", { id: event.currentTarget.dataset.id });
    },
    onMonth(event) {
      const key = event.currentTarget.dataset.key;
      const chip = (this.data.chips || []).find((item) => item.key === key);
      if (chip) this.triggerEvent("month", { period: chip.period });
    },
    onQuery(event) {
      this.triggerEvent("query", { value: event.detail.value });
    },
    onBase() {
      this.triggerEvent("base");
    },
  },
});
