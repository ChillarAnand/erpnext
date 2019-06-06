// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

cur_frm.add_fetch('employee','employee_name','employee_name');

frappe.ui.form.on("Leave Allocation", {
	onload: function(frm) {
		if(!frm.doc.from_date) frm.set_value("from_date", frappe.datetime.get_today());

		frm.set_query("employee", function() {
			return {
				query: "erpnext.controllers.queries.employee_query"
			}
		});
		frm.set_query("leave_type", function() {
			return {
				filters: {
					is_lwp: 0
				}
			}
		})
	},

	refresh: function(frm) {
		if(frm.doc.docstatus === 1 && frm.doc.status === "Active") {
			// expire current allocation
			frm.add_custom_button(__('Expire Allocation'), function() {
				frm.trigger("expire_allocation");
			});

			// opens leave balance report for employee
			frm.add_custom_button(__('Leave Balance'), function() {
				frappe.route_options = {
					employee: frm.doc.employee,
				};
				frappe.set_route("query-report", "Employee Leave Balance");
			});
		}
	},

	expire_allocation: function(frm) {
		frappe.call({
			method: 'erpnext.hr.doctype.leave_application.leave_application.expire_previous_allocation',
			args: {
				ref_doc: frm.doc
			},
			freeze: true,
			callback: function(r){
				if(!r.exc){
					frappe.msgprint(__("Allocation Expired!"));
				}
			}
		});
	},

	employee: function(frm) {
		frm.trigger("calculate_total_leaves_allocated");
	},

	leave_type: function(frm) {
		frm.trigger("leave_policy")
		frm.trigger("calculate_total_leaves_allocated");
	},

	carry_forward: function(frm) {
		frm.trigger("calculate_total_leaves_allocated");
	},

	carry_forwarded_leaves: function(frm) {
		frm.set_value("total_leaves_allocated",
			flt(frm.doc.carry_forwarded_leaves) + flt(frm.doc.new_leaves_allocated));
	},

	new_leaves_allocated: function(frm) {
		frm.set_value("total_leaves_allocated",
			flt(frm.doc.carry_forwarded_leaves) + flt(frm.doc.new_leaves_allocated));
	},

	leave_policy: function(frm) {
		if(frm.doc.leave_policy && frm.doc.leave_type) {
			frappe.db.get_value("Leave Policy Detail",
				{'parent': frm.doc.leave_policy, 'leave_type': frm.doc.leave_type},
				'annual_allocation', (r) => {
				if (!r.exc) {
					frm.set_value("new_leaves_allocated", flt(r.annual_allocation));
				}
			}, "Leave Policy")
		}
	},
	calculate_total_leaves_allocated: function(frm) {
		if (cint(frm.doc.carry_forward) == 1 && frm.doc.leave_type && frm.doc.employee) {
			return frappe.call({
				method: "erpnext.hr.doctype.leave_allocation.leave_allocation.get_carry_forwarded_leaves",
				args: {
					"employee": frm.doc.employee,
					"date": frm.doc.from_date,
					"leave_type": frm.doc.leave_type,
					"carry_forward": frm.doc.carry_forward
				},
				callback: function(r) {
					if (!r.exc && r.message) {
						frm.set_value('carry_forwarded_leaves', r.message);
						frm.set_value("total_leaves_allocated",
							flt(r.message) + flt(frm.doc.new_leaves_allocated));
					}
				}
			})
		} else if (cint(frm.doc.carry_forward) == 0) {
			frm.set_value("carry_forwarded_leaves", 0);
			frm.set_value("total_leaves_allocated", flt(frm.doc.new_leaves_allocated));
		}
	}
});