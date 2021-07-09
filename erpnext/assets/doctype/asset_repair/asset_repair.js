// Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Asset Repair', {
	refresh: function(frm) {
		frm.toggle_display(['completion_date', 'repair_status', 'accounting_details', 'accounting_dimensions_section'], !(frm.doc.__islocal));
	
		if (frm.doc.docstatus) {
			frm.add_custom_button("View General Ledger", function() {
				frappe.route_options = {
					"voucher_no": frm.doc.name
				};
				frappe.set_route("query-report", "General Ledger");
			});
		}
	},

	repair_status: (frm) => {
		if (frm.doc.completion_date && frm.doc.repair_status == "Completed") {
			frappe.call ({
				method: "erpnext.assets.doctype.asset_repair.asset_repair.get_downtime",
				args: {
					"failure_date":frm.doc.failure_date,
					"completion_date":frm.doc.completion_date
				},
				callback: function(r) {
					if(r.message) {
						frm.set_value("downtime", r.message + " Hrs");
					}
				}
			});
		}
	}
});
