(function () {
    window.redirectPath = null;
    const hashMarker = "#state=";
    if (window.user && window.location.hash && window.location.hash.length >= hashMarker.length && window.location.hash.substr(0, hashMarker.length) === hashMarker) {
        const stateJSON = decodeURIComponent(window.location.hash.substr(hashMarker.length));
        //console.log(`stateJSON=${stateJSON}`);
        if (stateJSON) {
            try {
                const stateObj = JSON.parse(stateJSON);
                if (stateObj.path) {
                    //console.log(`path=${stateObj.path}, window.location.pathname=${window.location.pathname}`);
                    var pathname = window.location.pathname;
                    if (pathname && pathname.length >= 1 && pathname.substr(pathname.length-1) === "/") pathname = pathname.substr(0, pathname.length-1);
                    pathname += stateObj.path;
                    window.redirectPath = pathname;
                }
            } catch(e) {}
        }
    }
    //console.log(`window.redirectPath=${window.redirectPath}`);
})();