frappe.provide('erpnext.hub.pages');

frappe.views.HubFactory = frappe.views.Factory.extend({
	make(route) {
		const page_name = frappe.get_route_str();
		const page = route[1];

		const assets = {
			'List': [
				'/assets/erpnext/js/hub/hub_page.js',
				'/assets/erpnext/css/hub.css',
			],
			'Form': [
				'/assets/erpnext/js/hub/hub_form.js',
				'/assets/erpnext/css/hub.css',
			]
		};

		if (!erpnext.hub.pages[page_name]) {
			if (!route[2]) {
				// page === 'Item' &&
				frappe.require(assets['List'], () => {
					erpnext.hub.pages[page_name] = new erpnext.hub[page+'Listing']({
						doctype: 'Hub Settings',
						parent: this.make_page(true, page_name)
					});
					window.hub_page = erpnext.hub.pages[page_name];
				});
			} else {
				frappe.require(assets['Form'], () => {
					erpnext.hub.pages[page_name] = new erpnext.hub[page+'Page']({
						unique_id: route[2],
						doctype: 'Hub Settings',
						parent: this.make_page(true, page_name)
					});
					window.hub_page = erpnext.hub.pages[page_name];
				});
			}
		} else {
			frappe.container.change_to(page_name);
			window.hub_page = erpnext.hub.pages[page_name];
		}
	}
});
