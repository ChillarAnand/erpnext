frappe.provide('hub');
frappe.provide('erpnext.hub');

erpnext.hub.Marketplace = class Marketplace {
	constructor({ parent }) {
		this.$parent = $(parent);
		this.page = parent.page;

		frappe.db.get_doc('Hub Settings')
			.then(doc => {
				this.hub_settings = doc;
				this.registered = doc.registered;

				this.setup_header();
				this.make_sidebar();
				this.make_body();
				this.setup_events();
				this.refresh();
			});
	}

	setup_header() {
		this.page.set_title(__('Marketplace'));
	}

	setup_events() {
		this.$parent.on('click', '[data-route]', (e) => {
			const $target = $(e.currentTarget);
			const route = $target.data().route;
			frappe.set_route(route);

			e.stopPropagation();
		});
	}

	make_sidebar() {
		this.$sidebar = this.$parent.find('.layout-side-section').addClass('hidden-xs');

		this.make_sidebar_nav_buttons();
		this.make_sidebar_categories();
	}

	make_sidebar_nav_buttons() {
		let $nav_group = this.$sidebar.find('[data-nav-buttons]');
		if (!$nav_group.length) {
			$nav_group = $('<ul class="list-unstyled hub-sidebar-group" data-nav-buttons>').appendTo(this.$sidebar);
		}
		$nav_group.empty();

		const user_specific_items_html = this.registered
			? `<li class="hub-sidebar-item text-muted" data-route="marketplace/profile">
					${__('Your Profile')}
				</li>
				<li class="hub-sidebar-item text-muted" data-route="marketplace/publish">
					${__('Publish Products')}
				</li>`

			: `<li class="hub-sidebar-item text-muted" data-route="marketplace/register">
					${__('Become a seller')}
				</li>`;

		$nav_group.append(`
			<li class="hub-sidebar-item" data-route="marketplace/home">
				${__('Browse')}
			</li>
			<li class="hub-sidebar-item" data-route="marketplace/favourites">
				${__('Favorites')}
			</li>
			${user_specific_items_html}
		`);
	}

	make_sidebar_categories() {
		frappe.call('erpnext.hub_node.get_categories')
			.then(r => {
				const categories = r.message.map(d => d.value).sort();
				const sidebar_items = [
					`<li class="hub-sidebar-item bold is-title">
						${__('Category')}
					</li>`,
					`<li class="hub-sidebar-item active" data-route="marketplace/home">
						${__('All')}
					</li>`,
					...(this.registered
						? [`<li class="hub-sidebar-item active" data-route="marketplace/my-products">
							${__('Your Products')}
						</li>`]
						: []),
					...categories.map(category => `
						<li class="hub-sidebar-item text-muted" data-route="marketplace/category/${category}">
							${__(category)}
						</li>
					`)
				];

				this.$sidebar.append(`
					<ul class="list-unstyled">
						${sidebar_items.join('')}
					</ul>
				`);

				this.update_sidebar();
			});
	}

	make_body() {
		this.$body = this.$parent.find('.layout-main-section');

		this.$body.on('seller-registered', () => {
			this.registered = 1;
			this.make_sidebar_nav_buttons();
		});
	}

	update_sidebar() {
		const route = frappe.get_route_str();
		const $sidebar_item = this.$sidebar.find(`[data-route="${route}"]`);

		const $siblings = this.$sidebar.find('[data-route]');
		$siblings.removeClass('active').addClass('text-muted');

		$sidebar_item.addClass('active').removeClass('text-muted');
	}

	refresh() {
		const route = frappe.get_route();
		this.subpages = this.subpages || {};

		for (let page in this.subpages) {
			this.subpages[page].hide();
		}

		if (route[1] === 'home' && !this.subpages.home) {
			this.subpages.home = new erpnext.hub.Home(this.$body);
		}

		if (route[1] === 'favourites' && !this.subpages.favourites) {
			this.subpages.favourites = new erpnext.hub.Favourites(this.$body);
		}

		if (route[1] === 'category' && route[2] && !this.subpages.category) {
			this.subpages.category = new erpnext.hub.Category(this.$body);
		}

		if (route[1] === 'item' && route[2] && !this.subpages.item) {
			this.subpages.item = new erpnext.hub.Item(this.$body);
		}

		if (route[1] === 'register' && !this.subpages.register) {
			// if (this.registered) {
			// 	frappe.set_route('marketplace', 'home');
			// 	return;
			// }
			this.subpages.register = new erpnext.hub.Register(this.$body);
		}

		if (route[1] === 'publish' && !this.subpages.publish) {
			this.subpages.publish = new erpnext.hub.Publish(this.$body);
		}


		if (!Object.keys(this.subpages).includes(route[1])) {
			frappe.show_not_found();
			return;
		}

		this.update_sidebar();
		frappe.utils.scroll_to(0);
		this.subpages[route[1]].show();
	}
}

class SubPage {
	constructor(parent) {
		this.$parent = $(parent);
		this.make_wrapper();
	}

	make_wrapper() {
		const page_name = frappe.get_route()[1];
		this.$wrapper = $(`<div class="marketplace-page" data-page-name="${page_name}">`).appendTo(this.$parent);
		this.hide();
	}

	show() {
		this.refresh();
		this.$wrapper.show();
	}

	hide() {
		this.$wrapper.hide();
	}
}

erpnext.hub.Home = class Home extends SubPage {
	make_wrapper() {
		super.make_wrapper();
		this.make_search_bar();
	}

	refresh() {
		this.get_items_and_render();
	}

	get_items_and_render() {
		this.$wrapper.find('.hub-card-container').empty();
		this.get_items()
			.then(items => {
				this.render(items);
			});
	}

	get_items() {
		return hub.call('get_data_for_homepage');
	}

	make_search_bar() {
		const $search = $(`
			<div class="hub-search-container">
				<input type="text" class="form-control" placeholder="Search for anything">
			</div>`
		);
		this.$wrapper.append($search);
		const $search_input = $search.find('input');

		$search_input.on('keydown', frappe.utils.debounce((e) => {
			if (e.which === frappe.ui.keyCode.ENTER) {
				this.search_value = $search_input.val();
				this.get_items_and_render();
			}
		}, 300));
	}

	render(items) {
		const html = get_item_card_container_html(items, __('Recently Published'));
		this.$wrapper.append(html)
	}
}

erpnext.hub.Favourites = class Favourites extends SubPage {
	refresh() {
		this.get_favourites()
			.then(r => {
				this.render(r.message);
			});
	}

	get_favourites() {
		return frappe.call('erpnext.hub_node.get_item_favourites');
	}

	render(items) {
		this.$wrapper.find('.hub-card-container').empty();
		const html = get_item_card_container_html(items, __('Favourites'));
		this.$wrapper.append(html)
	}
}

erpnext.hub.Category = class Category extends SubPage {
	refresh() {
		this.category = frappe.get_route()[2];
		this.get_items_for_category(this.category)
			.then(r => {
				this.render(r.message);
			});
	}

	get_items_for_category(category) {
		this.$wrapper.find('.hub-card-container').empty();
		return frappe.call('erpnext.hub_node.get_list', {
			doctype: 'Hub Item',
			filters: {
				hub_category: category
			}
		});
	}

	render(items) {
		const html = get_item_card_container_html(items, __(this.category));
		this.$wrapper.append(html)
	}
}

erpnext.hub.Item = class Item extends SubPage {
	refresh() {
		this.hub_item_code = frappe.get_route()[2];

		this.get_item(this.hub_item_code)
			.then(item => {
				this.render(item);
			});
	}

	get_item(hub_item_code) {
		return new Promise(resolve => {
			const item = (erpnext.hub.hub_item_cache || []).find(item => item.name === hub_item_code)

			if (item) {
				resolve(item);
			} else {
				frappe.call('erpnext.hub_node.get_list', {
					doctype: 'Hub Item',
					filters: {
						name: hub_item_code
					}
				})
				.then(r => {
					resolve(r.message[0]);
				});
			}
		});
	}

	render(item) {
		const title = item.item_name || item.name;
		const company = item.company_name;

		const who = __('Posted By {0}', [company]);
		const when = comment_when(item.creation);

		const city = item.seller_city ? item.seller_city + ', ' : '';
		const country = item.country ? item.country : '';
		const where = `${city}${country}`;

		const dot_spacer = '<span aria-hidden="true"> · </span>';

		const description = item.description || '';

		const rating_html = get_rating_html(item);
		const rating_count = item.reviews.length > 0 ? `(${item.reviews.length} reviews)` : '';

		const html = `
			<div class="hub-item-container">
				<div class="row visible-xs">
					<div class="col-xs-12 margin-bottom">
						<button class="btn btn-xs btn-default" data-route="marketplace/home">Back to home</button>
					</div>
				</div>
				<div class="row">
					<div class="col-md-3">
						<div class="hub-item-image">
							<img src="${item.image}">
						</div>
					</div>
					<div class="col-md-6">
						<h2>${title}</h2>
						<div class="text-muted">
							<p>${where}${dot_spacer}${when}</p>
							<p>${rating_html}${rating_count}</p>
						</div>
						<hr>
						<div class="hub-item-description">
						${description ?
							`<b>${__('Description')}</b>
							<p>${description}</p>
							` : __('No description')
						}
						</div>
					</div>
				</div>
				<div class="row hub-item-seller">
					<div class="col-md-12 margin-top margin-bottom">
						<b class="text-muted">Seller Information</b>
					</div>
					<div class="col-md-1">
						<img src="https://picsum.photos/200">
					</div>
					<div class="col-md-6">
						<a href="#marketplace/seller/${company}" class="bold">${company}</a>
						<p class="text-muted">
							Contact Seller
						</p>
					</div>
				</div>
				<!-- review area -->
				<div class="row hub-item-review-container">
					<div class="col-md-12 form-footer">
						<div class="form-comments">
							<div class="timeline">
								<div class="timeline-head"></div>
								<div class="timeline-items"></div>
							</div>
						</div>
						<div class="pull-right scroll-to-top">
							<a onclick="frappe.utils.scroll_to(0)"><i class="fa fa-chevron-up text-muted"></i></a>
						</div>
					</div>
				</div>
			</div>
		`;

		this.$wrapper.html(html);

		this.make_review_area();
		this.render_reviews(item);
	}

	make_review_area() {
		this.comment_area = new frappe.ui.ReviewArea({
			parent: this.$wrapper.find('.timeline-head').empty(),
			mentions: [],
			on_submit: (val) => {
				val.user = frappe.session.user;
				val.username = frappe.session.user_fullname;

				frappe.call({
					method: 'erpnext.hub_node.send_review',
					args: {
						hub_item_code: this.hub_item_code,
						review: val
					},
					callback: (r) => {
						console.log(r);
						this.render_reviews(r.message);
						this.comment_area.reset();
					},
					freeze: true
				});
			}
		});
	}

	render_reviews(item) {
		this.$wrapper.find('.timeline-items').empty();
		item.reviews.forEach(review => this.render_review(review, item));
	}

	render_review(review, item) {
		let username = review.username || review.user || __("Anonymous");

		let image_html = review.user_image
			? `<div class="avatar-frame" style="background-image: url(${review.user_image})"></div>`
			: `<div class="standard-image" style="background-color: #fafbfc">${frappe.get_abbr(username)}</div>`

		let edit_html = review.own
			? `<div class="pull-right hidden-xs close-btn-container">
				<span class="small text-muted">
					${'data.delete'}
				</span>
			</div>
			<div class="pull-right edit-btn-container">
				<span class="small text-muted">
					${'data.edit'}
				</span>
			</div>`
			: '';

		let rating_html = get_rating_html(item);

		const $timeline_items = this.$wrapper.find('.timeline-items');

		$(this.get_timeline_item(review, image_html, edit_html, rating_html))
			.appendTo($timeline_items);
	}

	get_timeline_item(data, image_html, edit_html, rating_html) {
		return `<div class="media timeline-item user-content" data-doctype="${''}" data-name="${''}">
			<span class="pull-left avatar avatar-medium hidden-xs" style="margin-top: 1px">
				${image_html}
			</span>
			<div class="pull-left media-body">
				<div class="media-content-wrapper">
					<div class="action-btns">${edit_html}</div>

					<div class="comment-header clearfix">
						<span class="pull-left avatar avatar-small visible-xs">
							${image_html}
						</span>

						<div class="asset-details">
							<span class="author-wrap">
								<i class="octicon octicon-quote hidden-xs fa-fw"></i>
								<span>${data.username}</span>
							</span>
							<a class="text-muted">
								<span class="text-muted hidden-xs">&ndash;</span>
								<span class="hidden-xs">${comment_when(data.modified)}</span>
							</a>
						</div>
					</div>
					<div class="reply timeline-content-show">
						<div class="timeline-item-content">
							<p class="text-muted">
								${rating_html}
							</p>
							<h6 class="bold">${data.subject}</h6>
							<p class="text-muted">
								${data.content}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>`;
	}
}
erpnext.hub.Register = class Register extends SubPage {
	make_wrapper() {
		super.make_wrapper();
		this.$register_container = $(`<div class="row register-container">`)
			.appendTo(this.$wrapper);
		this.$form_container = $('<div class="col-md-8 col-md-offset-1 form-container">')
			.appendTo(this.$wrapper);
	}

	refresh() {
		this.$register_container.empty();
		this.$form_container.empty();
		this.render();
	}

	render() {
		this.make_field_group();
	}

	make_field_group() {
		const fields = [
			{
				fieldtype: 'Link',
				fieldname: 'company',
				label: __('Company'),
				options: 'Company',
				onchange: () => {
					const value = this.field_group.get_value('company');

					if (value) {
						frappe.db.get_doc('Company', value)
							.then(company => {
								this.field_group.set_values({
									country: company.country,
									company_email: company.email,
									currency: company.default_currency
								});
							});
					}
				}
			},
			{
				fieldname: 'company_email',
				label: __('Email'),
				fieldtype: 'Data'
			},
			{
				fieldname: 'country',
				label: __('Country'),
				fieldtype: 'Read Only'
			},
			{
				fieldname: 'currency',
				label: __('Currency'),
				fieldtype: 'Read Only'
			},
			{
				fieldtype: 'Text',
				label: __('About your Company'),
				fieldname: 'company_description'
			}
		];

		this.field_group = new frappe.ui.FieldGroup({
			parent: this.$form_container,
			fields
		});

		this.field_group.make();

		const default_company = frappe.defaults.get_default('company');
		this.field_group.set_value('company', default_company);

		this.$form_container.find('.form-column').append(`
			<div class="text-right">
				<button type="submit" class="btn btn-primary btn-register btn-sm">${__('Submit')}</button>
			</div>
		`);

		this.$form_container.find('.form-message').removeClass('hidden small').addClass('h4').text(__('Become a Seller'))

		this.$form_container.on('click', '.btn-register', (e) => {
			const form_values = this.field_group.get_values();

			let values_filled = true;
			const mandatory_fields = ['company', 'company_email', 'company_description'];
			mandatory_fields.forEach(field => {
				const value = form_values[field];
				if (!value) {
					this.field_group.set_df_property(field, 'reqd', 1);
					values_filled = false;
				}
			});
			if (!values_filled) return;

			frappe.call({
				method: 'erpnext.hub_node.doctype.hub_settings.hub_settings.register_seller',
				args: form_values,
				btn: $(e.currentTarget)
			}).then(() => {
				frappe.set_route('marketplace', 'publish');

				// custom jquery event
				this.$wrapper.trigger('seller-registered');
			});
		});
	}
}

erpnext.hub.Publish = class Publish extends SubPage {
	make_wrapper() {
		super.make_wrapper();
		const title_html = `<b>${__('Select Products to Publish')}</b>`;
		const info = `<p class="text-muted">${__("Status decided by the 'Publish in Hub' field in Item.")}</p>`;
		const subtitle_html = `
		<p class="text-muted">
			${__(`Only products with an image, description and category can be published.
			Please update them if an item in your inventory does not appear.`)}
		</p>`;
		const publish_button_html = `<button class="btn btn-primary btn-sm publish-items">
			<i class="visible-xs octicon octicon-check"></i>
			<span class="hidden-xs">Publish</span>
		</button>`;

		const select_all_button = `<button class="btn btn-secondary btn-default btn-xs margin-right select-all">Select All</button>`;
		const deselect_all_button = `<button class="btn btn-secondary btn-default btn-xs deselect-all">Deselect All</button>`;

		const search_html = `<div class="hub-search-container">
			<input type="text" class="form-control" placeholder="Search Items">
		</div>`;

		const subpage_header = $(`
			<div class='subpage-title flex'>
				<div>
					${title_html}
					${subtitle_html}
				</div>
				${publish_button_html}
			</div>

			${search_html}

			${select_all_button}
			${deselect_all_button}
		`);

		this.$wrapper.append(subpage_header);

		this.setup_events();
	}

	setup_events() {
		this.$wrapper.find('.select-all').on('click', () => {
			this.$wrapper.find('.hub-card').addClass('active');
		});

		this.$wrapper.find('.deselect-all').on('click', () => {
			this.$wrapper.find('.hub-card').removeClass('active');
		});

		this.$wrapper.find('.publish-items').on('click', () => {
			this.publish_selected_items()
				.then(r => {
					frappe.msgprint('check');
				});
		});

		const $search_input = this.$wrapper.find('.hub-search-container input');
		this.search_value = '';

		$search_input.on('keydown', frappe.utils.debounce((e) => {
			if (e.which === frappe.ui.keyCode.ENTER) {
				this.search_value = $search_input.val();
				this.get_items_and_render();
			}
		}, 300));
	}

	get_items_and_render() {
		this.$wrapper.find('.hub-card-container').empty();
		this.get_valid_items()
			.then(r => {
				this.render(r.message);
			});
	}

	refresh() {
		this.get_items_and_render();
	}

	render(items) {
		const items_container = $(get_item_card_container_html(items));
		items_container.addClass('static').on('click', '.hub-card', (e) => {
			const $target = $(e.currentTarget);
			$target.toggleClass('active');
		});

		this.$wrapper.append(items_container);
	}

	get_valid_items() {
		return frappe.call(
			'erpnext.hub_node.get_valid_items',
			{
				search_value: this.search_value
			}
		);
	}

	publish_selected_items() {
		const items_to_publish = [];
		const items_to_unpublish = [];
		this.$wrapper.find('.hub-card').map(function () {
			const active = $(this).hasClass('active');

			if(active) {
				items_to_publish.push($(this).attr("data-id"));
			} else {
				items_to_unpublish.push($(this).attr("data-id"));
			}
		});

		return frappe.call(
			'erpnext.hub_node.publish_selected_items',
			{
				items_to_publish: items_to_publish,
				items_to_unpublish: items_to_unpublish
			}
		);
	}
}

function get_item_card_container_html(items, title='') {
	const items_html = (items || []).map(item => get_item_card_html(item)).join('');

	const html = `<div class="row hub-card-container">
		<div class="col-sm-12 margin-bottom">
			<b>${title}</b>
		</div>
		${items_html}
	</div>`;

	return html;
}

function get_item_card_html(item) {
	const item_name = item.item_name || item.name;
	const title = strip_html(item_name);
	const img_url = item.image;

	const company_name = item.company_name;

	const active = item.publish_in_hub;

	const id = item.hub_item_code || item.item_code;

	// Subtitle
	let subtitle = [comment_when(item.creation)];
	const rating = item.average_rating;
	if (rating > 0) {
		subtitle.push(rating + `<i class='fa fa-fw fa-star-o'></i>`)
	}
	subtitle.push(company_name);

	let dot_spacer = '<span aria-hidden="true"> · </span>';
	subtitle = subtitle.join(dot_spacer);

	// Decide item link
	const is_local = item.source_type === "local";
	const route = !is_local
		? `marketplace/item/${item.hub_item_code}`
		: `Form/Item/${item.item_name}`;

	const card_route = is_local ? '' : `data-route='${route}'`;

	const show_local_item_button = is_local
		? `<div class="overlay button-overlay" data-route='${route}' onclick="event.preventDefault();">
				<button class="btn btn-default zoom-view">
					<i class="octicon octicon-eye"></i>
				</button>
			</div>`
		: '';

	const item_html = `
		<div class="col-md-3 col-sm-4 col-xs-6">
			<div class="hub-card ${active ? 'active' : ''}" ${card_route} data-id="${id}">
				<div class="hub-card-header">
					<div class="title">
						<div class="hub-card-title ellipsis bold">${title}</div>
						<div class="hub-card-subtitle ellipsis text-muted">${subtitle}</div>
					</div>
					<i class="octicon octicon-check text-success"></i>
				</div>
				<div class="hub-card-body">
					<img class="hub-card-image ${item.image ? '' : 'no-image'}" src="${img_url}" />
					<div class="overlay hub-card-overlay"></div>
					${show_local_item_button}
				</div>
			</div>
		</div>
	`;

	return item_html;
}

function get_rating_html(item) {
	const rating = item.average_rating;
	let rating_html = ``;
	for (var i = 0; i < 5; i++) {
		let star_class = 'fa-star';
		if (i >= rating) star_class = 'fa-star-o';
		rating_html += `<i class='fa fa-fw ${star_class} star-icon' data-index=${i}></i>`;
	}
	return rating_html;
}

erpnext.hub.cache = {};
hub.call = function call_hub_method(method, args={}) {
	return new Promise((resolve, reject) => {

		// cache
		const key = method + JSON.stringify(args);
		if (erpnext.hub.cache[key]) {
			resolve(erpnext.hub.cache[key]);
		}

		// cache invalidation after 5 minutes
		setTimeout(() => {
			delete erpnext.hub.cache[key];
		}, 5 * 60 * 1000);

		frappe.call({
			method: 'erpnext.hub_node.call_hub_method',
			args: {
				method,
				params: args
			}
		})
		.then(r => {
			if (r.message) {
				erpnext.hub.cache[key] = r.message;
				resolve(r.message)
			}
			reject(r)
		})
		.fail(reject)
	});
}
