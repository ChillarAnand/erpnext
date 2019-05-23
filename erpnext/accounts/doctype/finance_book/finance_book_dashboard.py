from __future__ import unicode_literals

from frappe import _


def get_data():
	return {
		'fieldname': 'finance_book',
		'non_standard_fieldnames': {
			'Asset': 'default_finance_book',
			'Company': 'default_finance_book'
		},
		'transactions': [
			{
				'label': _('Assets'),
				'items': ['Asset', 'Asset Value Adjustment']
			},
			{
				'label': _('Companies'),
				'items': ['Company']
			},
			{
				'label': _('Journal Entries'),
				'items': ['Journal Entry']
			}
		]
	}
