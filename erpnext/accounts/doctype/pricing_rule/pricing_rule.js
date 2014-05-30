// Copyright (c) 2013, Web Notes Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.ui.form.on("Pricing Rule", "refresh", function(frm) {
	var help_content = ['<table class="table table-bordered" style="background-color: #f9f9f9;">',
		'<tr><td>',
			'<h4><i class="icon-hand-right"></i> ',
				__('Notes'),
			':</h4>',
			'<ul>',
				'<li>',
					__("Pricing Rule is made to overwrite Price List / define discount percentage, based on some criteria."),
				'</li>',
				'<li>',
					__("If selected Pricing Rule is made for 'Price', it will overwrite Price List. Pricing Rule price is the final price, so no further discount should be applied. Hence, in transactions like Sales Order, Purchase Order etc, it will be fetched in 'Rate' field, rather than 'Price List Rate' field."),
				'</li>',
				'<li>',
					__('Discount Percentage can be applied either against a Price List or for all Price List.'),
				'</li>',
				'<li>',
					__('To not apply Pricing Rule in a particular transaction, all applicable Pricing Rules should be disabled.'),
				'</li>',
			'</ul>',
		'</td></tr>',
		'<tr><td>',
			'<h4><i class="icon-question-sign"></i> ',
				__('How Pricing Rule is applied?'),
			'</h4>',
			'<ol>',
				'<li>',
					__("Pricing Rule is first selected based on 'Apply On' field, which can be Item, Item Group or Brand."),
				'</li>',
				'<li>',
					__("Then Pricing Rules are filtered out based on Customer, Customer Group, Territory, Supplier, Supplier Type, Campaign, Sales Partner etc."),
				'</li>',
				'<li>',
					__('Pricing Rules are further filtered based on quantity.'),
				'</li>',
				'<li>',
					__('If two or more Pricing Rules are found based on the above conditions, Priority is applied. Priority is a number between 0 to 20 while default value is zero (blank). Higher number means it will take precedence if there are multiple Pricing Rules with same conditions.'),
				'</li>',
				'<li>',
					__('Even if there are multiple Pricing Rules with highest priority, then following internal priorities are applied:'),
					'<ul>',
						'<li>',
							__('Item Code > Item Group > Brand'),
						'</li>',
						'<li>',
							__('Customer > Customer Group > Territory'),
						'</li>',
						'<li>',
							__('Supplier > Supplier Type'),
						'</li>',
					'</ul>',
				'</li>',
				'<li>',
					__('If multiple Pricing Rules continue to prevail, users are asked to set Priority manually to resolve conflict.'),
				'</li>',
			'</ol>',
		'</td></tr>',
	'</table>'].join("\n");

	set_field_options("pricing_rule_help", help_content);
});
