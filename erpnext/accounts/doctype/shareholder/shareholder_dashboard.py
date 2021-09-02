from __future__ import unicode_literals



def get_data():
	return {
		'fieldname': 'shareholder',
		'non_standard_fieldnames': {
			'Share Transfer': 'to_shareholder'
		},
		'transactions': [
			{
				'items': ['Share Transfer']
			}
		]
	}
