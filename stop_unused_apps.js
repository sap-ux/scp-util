const { exec } = require("child_process");

var iCurrentTime = new Date().getTime();
var nMaxIdleHours = 24*7; // 7 days

// convert exec function to a promise
function os_func() {
    this.exec = function (cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, (oError, sOut, sError) => {
                if (oError) {
                    console.log(`# Error: ${oError.message}`);
                } 
                if (sError) {
                    console.log(`# Stderr: ${sError}`);
                }
                if (oError || sError) {
                    reject(sError);
                    return;
                }
                resolve(sOut);
            });
        })
    }
}

var os = new os_func();

// check input
if (process.argv.length < 6) {
    console.log("# please specify cf login by: node stop-unused-apps.js <user> <password> <org> <space> <max_idle_hours>");
    process.exit(0);
}

// login
os.exec(`cf login -u ${process.argv[2]} -p ${process.argv[3]} -o ${process.argv[4]} -s ${process.argv[5]}`).then(sOut=>{
    console.log(`# Login successful: \n\n${sOut}`);
    if (process.argv.length > 6) {
        nMaxIdleHours = Number(process.argv[6]);
    }
    listApps();
});

function listApps(){
    // list started apps
    os.exec("cf apps").then(sOut=>{        
        console.log(`# cf apps (started): \n\n${sOut}`);
        let sStartedApps = sOut, aStartedApps = [];        
        // convert list of started apps into array [appName, state, instances, memory, disk, URL]
        let aLines = sStartedApps.split(/\r?\n/);        
        for (let i = 0; i < aLines.length; i++) {
            let a = aLines[i].split(/\s+/);
            if (!a[0] || a[1] != "started")
                continue;
            let oEntry = {"name":a[0],"state":a[1],"memory":a[3],"disk":a[4],"lastLog":null,"lastLogTime":null,"idleHours":null};
            aStartedApps.push(oEntry);
        }
        //console.log('# Converted array:\n\n ' + JSON.stringify(aStartedApps, null, 4)+"\n");
        filterAndStopUnusedApps(aStartedApps);
    }); // end of os exec cf apps
} // end of list apps

function filterAndStopUnusedApps(aStartedApps) {
    let aPromises = [], aUnusedApps = [];
    for ( let i = 0; i < aStartedApps.length; i++  ){
        let oEntry = aStartedApps[i];
        let p = os.exec("cf logs "+oEntry.name+" --recent").then(res=> {
            let aLines = res.trim().split(/\r?\n/); 
            let sLastLine = null;
            if (aLines.length > 0) {
                sLastLine = aLines[aLines.length - 1].trim();
            }
            oEntry.lastLog = sLastLine;
            if (oEntry.lastLog) {
                oEntry.lastLogTime = Date.parse(oEntry.lastLog.split(/\s+/)[0]);
                oEntry.idleHours = (iCurrentTime - oEntry.lastLogTime)/1000/3600;
                if (oEntry.idleHours >= nMaxIdleHours) {
                    aUnusedApps.push(oEntry); // pass max idle hours, stop this app
                }
            } else {
                aUnusedApps.push(oEntry); // no log entry, stop this app
            }
        });
        aPromises.push(p);
    }
    Promise.all(aPromises).then((values) => {
        console.log('# started apps (with log time and idle hours):\n\n' + JSON.stringify(aStartedApps, null, 4)+"\n");
        //stopUnusedApps(aUnusedApps);
    });
}

function stopUnusedApps(aUnusedApps) {
    if (!aUnusedApps || aUnusedApps.length == 0) {
        console.log("# No unsed app to stop");
        return;
    }
    let aPromises = [];
    for ( let i = 0; i < aUnusedApps.length; i++  ){
        let oEntry = aUnusedApps[i];
        let p = os.exec("cf stop "+oEntry.name).then(res=> {
            console.log(res);
            oEntry.state = "stopped";
        });
        aPromises.push(p);
    }
    Promise.all(aPromises).then((values) => {
        console.log('# All unused apps stopped:\n\n' + JSON.stringify(aUnusedApps, null, 4)+"\n");
    });
}