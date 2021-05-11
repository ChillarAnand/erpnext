// Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Asset Repair', {
	// setup: function(frm) {
	// 	frm.add_fetch("company", "repair_and_maintenance_account", "payable_account");

	// 	frm.set_query("payable_account", function() {
	// 		return {
	// 			filters: {
	// 				"report_type": "Balance Sheet",
	// 				"account_type": "Payable",
	// 				"company": frm.doc.company,
	// 				"is_group": 0
	// 			}
	// 		};
	// 	});
	// },

	// stock_items_add: function(frm){
	// 	var table = frm.doc.stock_items;
	// 	for(var i in table) {
	// 		if (table[i].valuation_rate == 0) {  
	// 			frm.set_value(table[i].total_value, (table[i].valuation_rate * table[i].consumed_quantity))
	// 		}
	// 	}
	// },

	refresh: function(frm) {
		frm.toggle_display(['completion_date', 'repair_status', 'accounting_details', 'stock_items_section'], !(frm.doc.__islocal));
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
