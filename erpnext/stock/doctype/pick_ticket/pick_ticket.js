// Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Pick Ticket', {
	refresh: (frm) => {
		this.frm.add_custom_button(__('Sales Order'), function() {
			erpnext.utils.map_current_doc({
				method: "erpnext.selling.doctype.sales_order.sales_order.make_pick_ticket",
				source_doctype: "Sales Order",
				target: frm,
				setters: {
					company: frm.doc.company || undefined,
				},
				get_query_filters: {
					docstatus: 1,
				}
			});
		}, __("Get items from"));

		frm.add_custom_button(__('Get Item Locations'), () => {
			frm.trigger('set_item_locations');
		});
	},

	set_item_locations: (frm) => {
		frm.call('set_item_locations')
	}

});
