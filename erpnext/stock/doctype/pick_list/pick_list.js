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
	},
	refresh: (frm) => {
		frm.add_custom_button(__('Delivery Note'), () => frm.trigger('make_delivery_note'), __('Create'));

		if (frm.doc.reference_items && frm.doc.reference_items.length) {
			frm.add_custom_button(__('Get Item Locations'), () => {
				frm.call('set_item_locations');
			});
		}

		frm.trigger('add_get_items_button');
	},
	items_based_on: (frm) => {
		frm.trigger('add_get_items_button');
	},
	make_delivery_note(frm) {
		frappe.model.open_mapped_doc({
			method: 'erpnext.stock.doctype.pick_list.pick_list.make_delivery_note',
			frm: frm
		});
	},
	add_get_items_button(frm) {
		frm.remove_custom_button(__("Get items"));
		let source_doctype = frm.doc.items_based_on;
		let date_field = 'transaction_date';
		let get_query_method = null;
		let get_query_filters = {
			docstatus: 1,
			per_delivered: ['<', 100],
			status: ['!=', '']
		};
		let method = 'erpnext.selling.doctype.sales_order.sales_order.make_pick_list';
		if (source_doctype === 'Work Order') {
			method = 'erpnext.manufacturing.doctype.work_order.work_order.make_pick_list';
			date_field = 'planned_start_date';
			get_query_method = 'erpnext.stock.doctype.pick_list.pick_list.get_pending_work_orders';
			get_query_filters = null;
		}

		let get_query = () => {
			return {
				'query': get_query_method,
				'filters': get_query_filters
			};
		};

		frm.add_custom_button(__("Get items"), () => {
			erpnext.utils.map_current_doc({
				method: method,
				source_doctype: source_doctype,
				target: frm,
				setters: {
					company: frm.doc.company,
				},
				date_field: date_field,
				get_query: get_query
			});
		});
	}
});
