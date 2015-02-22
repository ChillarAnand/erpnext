// Copyright (c) 2013, Web Notes Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

// get tax rate
cur_frm.cscript.account_head = function(doc, cdt, cdn) {
	var d = locals[cdt][cdn];
	if(!d.charge_type && d.account_head){
		msgprint("Please select Charge Type first");
		frappe.model.set_value(cdt, cdn, "account_head", "");
	} else if(d.account_head && d.charge_type!=="Actual") {
		frappe.call({
			type:"GET",
			method: "erpnext.controllers.accounts_controller.get_tax_rate",
			args: {"account_head":d.account_head},
			callback: function(r) {
			  frappe.model.set_value(cdt, cdn, "rate", r.message || 0);
			}
		})
	}
}


var validate_taxes_and_charges = function(cdt, cdn) {
	var d = locals[cdt][cdn];
	if(!d.charge_type && (d.row_id || d.rate || d.tax_amount)) {
		msgprint(__("Please select Charge Type first"));
		d.row_id = "";
		d.rate = d.tax_amount = 0.0;
	} else if((d.charge_type == 'Actual' || d.charge_type == 'On Net Total') && d.row_id) {
		msgprint(__("Can refer row only if the charge type is 'On Previous Row Amount' or 'Previous Row Total'"));
		d.row_id = "";
	} else if((d.charge_type == 'On Previous Row Amount' || d.charge_type == 'On Previous Row Total') && d.row_id) {
		if (d.idx == 1) {
			msgprint(__("Cannot select charge type as 'On Previous Row Amount' or 'On Previous Row Total' for first row"));
			d.charge_type = '';
		} else if (d.row_i && d.row_id >= d.idx) {
			msgprint(__("Cannot refer row number greater than or equal to current row number for this Charge type"));
			d.row_id = "";
		}
	}
	validated = false;
	refresh_field('row_id', d.name, 'taxes');
}

frappe.ui.form.on(cur_frm.cscript.tax_table, "row_id", function(frm, cdt, cdn) {
	validate_taxes_and_charges(cdt, cdn);
});

frappe.ui.form.on(cur_frm.cscript.tax_table, "rate", function(frm, cdt, cdn) {
	validate_taxes_and_charges(cdt, cdn);
});

frappe.ui.form.on(cur_frm.cscript.tax_table, "tax_amount", function(frm, cdt, cdn) {
	validate_taxes_and_charges(cdt, cdn);
});

frappe.ui.form.on(cur_frm.cscript.tax_table, "charge_type", function(frm, cdt, cdn) {
	validate_taxes_and_charges(cdt, cdn);
});


cur_frm.set_query("account_head", "taxes", function(doc) {
	if(cur_frm.cscript.tax_table == "Sales Taxes and Charges") {
		var account_type = ["Tax", "Chargeable", "Expense Account"];
	} else {
		var account_type = ["Tax", "Chargeable", "Income Account"];
	}

	return {
		query: "erpnext.controllers.queries.tax_account_query",
		filters: {
			"account_type": account_type,
			"company": doc.company
		}
	}
});

cur_frm.set_query("cost_center", "taxes", function(doc) {
	return {
		filters: {
			'company': doc.company,
			'group_or_ledger': "Ledger"
		}
	}
});

// For customizing print
cur_frm.pformat.print_total = function(doc) { return ''; }
cur_frm.pformat.discount_amount = function(doc) { return ''; }
cur_frm.pformat.grand_total = function(doc) { return ''; }
cur_frm.pformat.rounded_total = function(doc) { return ''; }
cur_frm.pformat.in_words = function(doc) { return ''; }

cur_frm.pformat.taxes= function(doc){
	//function to make row of table
	var make_row = function(title, val, bold){
		var bstart = '<b>'; var bend = '</b>';
		return '<tr><td style="width:50%;">' + (bold?bstart:'') + title + (bold?bend:'') + '</td>'
			+ '<td style="width:50%;text-align:right;">' + format_currency(val, doc.currency) + '</td>'
			+ '</tr>';
	}

	function convert_rate(val) {
		var new_val = flt(val)/flt(doc.conversion_rate);
		return new_val;
	}

	function print_hide(fieldname) {
		var doc_field = frappe.meta.get_docfield(doc.doctype, fieldname, doc.name);
		return doc_field.print_hide;
	}

	out ='';
	if (!doc.print_without_amount) {
		var cl = doc.taxes || [];

		// outer table
		var out='<div><table class="noborder" style="width:100%"><tr><td style="width: 60%"></td><td>';

		// main table

		out +='<table class="noborder" style="width:100%">';

		if(!print_hide('print_total')) {
			out += make_row('Net Total', doc.print_total, 1);
		}

		// add rows
		if(cl.length){
			for(var i=0;i<cl.length;i++) {
				if(convert_rate(cl[i].tax_amount)!=0 && !cl[i].included_in_print_rate)
					out += make_row(cl[i].description, convert_rate(cl[i].tax_amount), 0);
			}
		}

		// Discount Amount
		if(!print_hide('discount_amount') && doc.discount_amount)
			out += make_row('Discount Amount', doc.discount_amount, 0);

		// grand total
		if(!print_hide('grand_total'))
			out += make_row('Grand Total', doc.grand_total, 1);

		if(!print_hide('rounded_total'))
			out += make_row('Rounded Total', doc.rounded_total, 1);

		if(doc.in_words && !print_hide('in_words')) {
			out +='</table></td></tr>';
			out += '<tr><td colspan = "2">';
			out += '<table><tr><td style="width:25%;"><b>In Words</b></td>';
			out += '<td style="width:50%;">' + doc.in_words + '</td></tr>';
		}
		out += '</table></td></tr></table></div>';
	}
	return out;
}
