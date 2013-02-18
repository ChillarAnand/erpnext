// ERPNext - web based ERP (http://erpnext.com)
// Copyright (C) 2012 Web Notes Technologies Pvt Ltd
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

cur_frm.cscript.tname = "Material Request Item";
cur_frm.cscript.fname = "indent_details";

wn.require('app/buying/doctype/purchase_common/purchase_common.js');
wn.require('app/utilities/doctype/sms_control/sms_control.js');

erpnext.buying.PurchaseRequestController = erpnext.buying.BuyingController.extend({
	refresh: function(doc) {
		this._super();
		
		if(doc.docstatus == 1 && doc.status != 'Stopped'){
			cur_frm.add_custom_button("Make Supplier Quotation", cur_frm.cscript.make_supplier_quotation);
			if(flt(doc.per_ordered, 2) < 100) {
				cur_frm.add_custom_button('Make Purchase Order', cur_frm.cscript['Make Purchase Order']);
				cur_frm.add_custom_button('Stop Material Request', cur_frm.cscript['Stop Material Request']);
			}
			cur_frm.add_custom_button('Send SMS', cur_frm.cscript.send_sms);

		}

		if(doc.docstatus == 1 && doc.status == 'Stopped')
			cur_frm.add_custom_button('Unstop Material Request', cur_frm.cscript['Unstop Material Request'])
	}
});

var new_cscript = new erpnext.buying.PurchaseRequestController({frm: cur_frm});

// for backward compatibility: combine new and previous states
$.extend(cur_frm.cscript, new_cscript);

	
//========================== On Load =================================================
cur_frm.cscript.onload = function(doc, cdt, cdn) {
	if (!doc.transaction_date) doc.transaction_date = dateutil.obj_to_str(new Date())
	if (!doc.status) doc.status = 'Draft';

	// defined in purchase_common.js
	//cur_frm.cscript.update_item_details(doc, cdt, cdn);
}

cur_frm.cscript.onload_post_render = function(doc, cdt, cdn) {
	// second call
	if(doc.__islocal){ 
		cur_frm.cscript.get_item_defaults(doc);
	}	
}

cur_frm.cscript.get_item_defaults = function(doc) {
		var ch = getchildren( 'Material Request Item', doc.name, 'indent_details');
		if (flt(ch.length) > 0){
			$c_obj(make_doclist(doc.doctype, doc.name), 'get_item_defaults', '', function(r, rt) {refresh_field('indent_details'); });
		}
}

//======================= transaction date =============================
cur_frm.cscript.transaction_date = function(doc,cdt,cdn){
	if(doc.__islocal){ 
		cur_frm.cscript.get_default_schedule_date(doc);
	}
}

//=================== Quantity ===================================================================
cur_frm.cscript.qty = function(doc, cdt, cdn) {
	var d = locals[cdt][cdn];
	if (flt(d.qty) < flt(d.min_order_qty))
		alert("Warning: Material Requested Qty is less than Minimum Order Qty");
}

// On Button Click Functions
// ------------------------------------------------------------------------------

// Make Purchase Order
cur_frm.cscript['Make Purchase Order'] = function() {
	var doc = cur_frm.doc;
	n = wn.model.make_new_doc_and_get_name('Purchase Order');
	$c('dt_map', args={
		'docs':wn.model.compress([locals['Purchase Order'][n]]),
		'from_doctype':doc.doctype,
		'to_doctype':'Purchase Order',
		'from_docname':doc.name,
		'from_to_list':"[['Material Request','Purchase Order'],['Material Request Item','Purchase Order Item']]"
		}, function(r,rt) {
			 loaddoc('Purchase Order', n);
		}
	);
}

// Stop INDENT
// ==================================================================================================
cur_frm.cscript['Stop Material Request'] = function() {
	var doc = cur_frm.doc;
	var check = confirm("Do you really want to STOP this Material Request?");

	if (check) {
		$c('runserverobj', args={'method':'update_status', 'arg': 'Stopped', 'docs': wn.model.compress(make_doclist(doc.doctype, doc.name))}, function(r,rt) {
			cur_frm.refresh();
		});
	}
}

// Un Stop INDENT
//====================================================================================================
cur_frm.cscript['Unstop Material Request'] = function(){
	var doc = cur_frm.doc
	var check = confirm("Do you really want to UNSTOP this Material Request?");
	
	if (check) {
		$c('runserverobj', args={'method':'update_status', 'arg': 'Submitted','docs': wn.model.compress(make_doclist(doc.doctype, doc.name))}, function(r,rt) {
			cur_frm.refresh();
			
		});
	}
}

cur_frm.cscript.make_supplier_quotation = function() {
	var new_sq_name = wn.model.make_new_doc_and_get_name("Supplier Quotation");
	$c("dt_map", {
		"docs": wn.model.compress([locals['Supplier Quotation'][new_sq_name]]),
		"from_doctype": cur_frm.doc.doctype,
		"to_doctype": "Supplier Quotation",
		"from_docname": cur_frm.doc.name,
		"from_to_list": JSON.stringify([['Material Request', 'Supplier Quotation'],
			['Material Request Item', 'Supplier Quotation Item']]),
	}, function(r, rt) { loaddoc("Supplier Quotation", new_sq_name) });
}