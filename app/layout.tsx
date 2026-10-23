import type { Metadata } from "next";
import { StoreProvider } from "@/components/store-provider";
import { SplashScreen } from "@/components/splash-screen";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swag Shopping Mall — Better goods. Better prices.",
  description: "Shop thoughtfully sourced everyday essentials at Swag Shopping Mall.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <SplashScreen />
          <Header />
          <main>{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
