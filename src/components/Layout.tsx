import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import StickyContactBar from "./StickyContactBar";
import ChatWidget from "./ChatWidget";
import SeasonalBanner from "./home/SeasonalBanner";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <SeasonalBanner />
      <Navbar />
      <main className="flex-1 pt-20 pb-16 md:pb-0">{children}</main>
      <Footer />
      <StickyContactBar />
      <ChatWidget />
    </div>
  );
};

export default Layout;
