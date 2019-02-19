import Home from "./pages/Home.vue";
import ProgramPage from "./pages/ProgramPage.vue";
import ContentPage from "./pages/ContentPage.vue";
import ListPage from "./pages/ListPage.vue";
import ProfilePage from "./pages/ProfilePage.vue";

const routes = [
	{name: 'home', path: '', component: Home},
	{name: 'program', path: '/Program/:program_name', component: ProgramPage, props: true},
	{
		name: 'content',
		path: '/Program/:program_name/:course/:type/:content',
		component: ContentPage,
		props: true,
		beforeEnter: (to, from, next) => {
			if(!lms.store.checkLogin()){
				next({name: 'home'})
			}
			else {
				next()
			}
		}
	},
	{
		name: 'list',
		path: '/List/:master',
		component: ListPage,
		props: true
	},
	{
		name: 'signup',
		path: '/Signup',
		beforeEnter(to, from, next) {
        	window.location = window.location.origin.toString() +'/login#signup'
    	},
		component: ListPage,
		props: true
	},
	{
		name: 'profile',
		path: '/Profile',
		component: ProfilePage,
		props: true,
		beforeEnter: (to, from, next) => {
			if(!lms.store.checkLogin()){
				next({name: 'home'})
			}
			else {
				next()
			}
		}
	}
];

export default routes;