import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";

import { broadcastLogout, clearClientAuthState } from "src/api/forceLogout";
import { initialiseUserData } from "src/slices/userDataSlice";

function useLogout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // remove indicator cookie, clear user data and redirect to signin
  function handleLogout() {
    clearClientAuthState();
    router.replace("/signin");
  }

  useEffect(() => {
    if (pathname === "/signin") {
      dispatch(initialiseUserData());
      queryClient.clear();
    }
  }, [pathname]);

  // call server-side logout to clear httpOnly cookie and invalidate the token
  function logout() {
    fetch("/api/logout", { method: "POST" })
      .catch((error) => {
        console.error("Logout request failed", error);
      })
      .finally(() => {
        handleLogout();
        //broadcasts the logout event to other windows and tabs to log them out
        broadcastLogout();
      });
  }

  return { handleLogout, logout };
}

export default useLogout;
