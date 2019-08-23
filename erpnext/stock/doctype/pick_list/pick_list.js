// Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Pick List', {
	setup: (frm) => {
		frm.set_query('parent_warehouse', () => {
			return {
				filters: {
					'is_group': 1,
					'company': frm.doc.company
				}
			};
		});
		frm.set_query('work_order', () => {
			return {
				query: 'erpnext.stock.doctype.pick_list.pick_list.get_pending_work_orders',
				filters: {
					'company': frm.doc.company
				}
			};
		});
	},
	refresh: (frm) => {
		frm.trigger('add_get_items_button');

		if (frm.doc.items && (frm.doc.items.length > 1 || frm.doc.items[0].item_code) && frm.doc.docstatus === 0) {
			frm.add_custom_button(__('Get Item Locations'), () => {
				frm.call('set_item_locations');
			}).addClass('btn-primary');
		}
		if (frm.doc.docstatus === 1) {
			if (frm.doc.purpose === 'Delivery against Sales Order') {
				frm.add_custom_button(__('Delivery Note'), () => frm.trigger('create_delivery_note'), __('Create'));
			} else {
				frappe.xcall('erpnext.stock.doctype.pick_list.pick_list.stock_entry_exists', {
					'pick_list_name': frm.doc.name
				}).then(exists => {
					if (exists) return;
					frm.add_custom_button(__('Stock Entry'), () => frm.trigger('create_stock_entry'), __('Create'));
				});
			}
		}
	},
	work_order: (frm) => {
		frappe.db.get_value('Work Order',
			frm.doc.work_order,
			['qty', 'material_transferred_for_manufacturing']
		).then(data => {
			let qty_data = data.message;
			let max = qty_data.qty - qty_data.material_transferred_for_manufacturing;
			frappe.prompt({
				fieldtype: 'Float',
				label: __('Qty of Finished Goods Item'),
				fieldname: 'qty',
				description: __('Max: {0}', [max]),
				default: max
			}, (data) => {
				frm.set_value('for_qty', data.qty);
				if (data.qty > max) {
					frappe.msgprint(__('Quantity must not be more than {0}', [max]));
					return;
				}
				frm.clear_table('items');
				frm.clear_table('locations');
				erpnext.utils.map_current_doc({
					method: 'erpnext.manufacturing.doctype.work_order.work_order.create_pick_list',
					target: frm,
					source_name: frm.doc.work_order
				});
			}, __("Select Quantity"), __('Get Items'));
		});
	},
	purpose: (frm) => {
		frm.clear_table('items');
		frm.clear_table('locations');
		frm.trigger('add_get_items_button');
	},
	create_delivery_note(frm) {
		frappe.model.open_mapped_doc({
			method: 'erpnext.stock.doctype.pick_list.pick_list.create_delivery_note',
			frm: frm
		});
	},
	create_stock_entry(frm) {
		frappe.xcall('erpnext.stock.doctype.pick_list.pick_list.create_stock_entry', {
			'pick_list': frm.doc,
		}).then(stock_entry => {
			frappe.model.sync(stock_entry);
			frappe.set_route("Form", 'Stock Entry', stock_entry.name);
		});
	},
	add_get_items_button(frm) {
		let purpose = frm.doc.purpose;
		if (purpose != 'Delivery against Sales Order' || frm.doc.docstatus !== 0) return;
		let get_query_filters = {
			docstatus: 1,
			per_delivered: ['<', 100],
			status: ['!=', ''],
			customer: frm.doc.customer
		};
		frm.get_items_btn = frm.add_custom_button(__('Get Items'), () => {
			if (!frm.doc.customer) {
				frappe.msgprint(__('Please select Customer first'));
				return;
			}
			erpnext.utils.map_current_doc({
				method: 'erpnext.selling.doctype.sales_order.sales_order.make_pick_list',
				source_doctype: 'Sales Order',
				target: frm,
				setters: {
					company: frm.doc.company,
					customer: frm.doc.customer
				},
				date_field: 'transaction_date',
				get_query_filters: get_query_filters
			});
		});
	}
});


// frappe.ui.form.on('Pick List Reference Item', {
// 	item_code: (frm, cdt, cdn) => {
// 		let row = locals[cdt][cdn];
// 		if (row.item_code) {
// 			frappe.xcall('');
// 		}
// 	}
// });