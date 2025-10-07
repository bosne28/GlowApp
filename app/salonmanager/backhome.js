import { useRouter, usePathname } from "expo-router";
import { Redirect } from "expo-router";

const BackHome = () => {
    const router = useRouter();
    const pathname = usePathname(); // Obține calea paginii curente

    if (pathname.startsWith("/salonmanager")) {
        return <Redirect href="/home" />;
    }

    return <Redirect href="/salonmanager" />;
};

export default BackHome;
