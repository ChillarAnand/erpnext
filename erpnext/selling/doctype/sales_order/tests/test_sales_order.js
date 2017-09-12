QUnit.module('Sales Order');

QUnit.test("test sales order", function(assert) {
	assert.expect(10);
	let done = assert.async();
	frappe.run_serially([
		() => {
			return frappe.tests.make('Sales Order', [
				{customer: 'Test Customer 1'},
				{items: [
					[
						{'delivery_date': frappe.datetime.add_days(frappe.defaults.get_default("year_end_date"), 1)},
						{'qty': 5},
						{'item_code': 'Test Product 4'},
						{'uom': 'Nos'},
						{'margin_type': 'Percentage'},
						{'discount_percentage': 10},
					]
				]},
				{customer_address: 'Test1-Billing'},
				{shipping_address_name: 'Test1-Shipping'},
				{contact_person: 'Contact 1-Test Customer 1'},
				{taxes_and_charges: 'TEST In State GST'},
				{tc_name: 'Test Term 1'},
				{terms: 'This is Test'}
			]);
		},
		() => {
			return frappe.tests.set_form_values(cur_frm, [
				{selling_price_list:'Test-Selling-USD'}
			]);
		},
		() => frappe.timeout(.5),
		() => {
			return frappe.tests.set_form_values(cur_frm, [
				{currency: 'USD'},
				{apply_discount_on:'Grand Total'},
				{additional_discount_percentage:10}
			]);
		},
		() => frappe.timeout(1),
		() => {
			// get_item_details
			assert.ok(cur_frm.doc.items[0].item_name=='Test Product 4', "Item name correct");
			// get tax details
			assert.ok(cur_frm.doc.taxes_and_charges=='TEST In State GST', "Tax details correct");
			// get tax account head details
			assert.ok(cur_frm.doc.taxes[0].account_head=='CGST - '+frappe.get_abbr(frappe.defaults.get_default('Company')), " Account Head abbr correct");
			// calculate totals
			assert.ok(cur_frm.doc.items[0].price_list_rate==90, "Item 1 price_list_rate");
			assert.ok(cur_frm.doc.total== 405, "total correct ");
			assert.ok(cur_frm.doc.net_total== 364.5, "net total correct ");
			assert.ok(cur_frm.doc.grand_total== 397.30, "grand total correct ");
			assert.ok(cur_frm.doc.rounded_total== 397.30, "rounded total correct ");
		},
		() => cur_frm.save(),
		() => frappe.timeout(1),
		() => cur_frm.print_doc(),
		() => frappe.timeout(1),
		() => {
			assert.ok($('.btn-print-print').is(':visible'), "Print Format Available");
			frappe.timeout(1);
			assert.ok($(".section-break+ .section-break .column-break:nth-child(1) .data-field:nth-child(1) .value").text().includes("Billing Street 1"), "Print Preview Works As Expected");
		},
		() => cur_frm.print_doc(),
		() => frappe.tests.click_button('Submit'),
		() => frappe.tests.click_button('Yes'),
		() => frappe.timeout(0.3),
		() => done()
	]);
});
