(function () {
    if (typeof window === "undefined" || window.__gaInitialConfig) return;

    const currentScript = document.currentScript;
    const gtagId = currentScript && currentScript.getAttribute("data-gtag-id");
    if (!gtagId) return;

    window.__gaInitialConfig = true;
    window.dataLayer = window.dataLayer || [];

    function gtag() {
        window.dataLayer.push(arguments);
    }

    window.gtag = window.gtag || gtag;

    gtag("consent", "default", {
        ad_storage: "denied",
        analytics_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        functionality_storage: "denied",
        personalization_storage: "denied",
        security_storage: "granted",
    });

    gtag("js", new Date());
    gtag("config", gtagId);
})();
