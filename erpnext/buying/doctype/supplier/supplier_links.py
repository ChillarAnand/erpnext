from frappe import _

links = {
	'fieldname': 'supplier',
	'transactions': [
		{
			'label': _('Procurement'),
			'items': ['Material Request', 'Request for Quotation', 'Supplier Quotation']
		},
		{
			'label': _('Orders'),
			'items': ['Purchase Order', 'Purchase Receipt', 'Purchase Invoice']
		}
	]
}