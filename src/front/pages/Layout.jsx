import { Outlet } from "react-router-dom/dist";
import ScrollToTop from "../components/ScrollToTop";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Footer } from "../components/Footer";

// Base component that maintains the header, sidebar and footer throughout the page and the scroll to top functionality.
export const Layout = () => {
	return (
		<ScrollToTop>
			<div className="flex min-h-screen flex-col">
				<Header />
				<div className="flex flex-1">
					<Sidebar />
					<div className="flex min-w-0 flex-1 flex-col">
						<Outlet />
						<Footer />
					</div>
				</div>
			</div>
		</ScrollToTop>
	);
};
