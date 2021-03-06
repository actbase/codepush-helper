#!/usr/bin/env node

const fs = require("fs");
const {exec} = require("child_process");
const readline = require("readline");
const plist = require("plist");
const Xcode = require("xcode-node").default;

const readFile = path => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const writeFile = (path, content) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const readDir = path => {
  return new Promise((resolve, reject) => {
    fs.readdir(path, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const execute = cmd => {
  return new Promise((resolve, reject) => {
    exec(cmd?.replace(/\n/g, " "), (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve({stdout, stderr});
      }
    });
  });
};

const parseStr = (str) => {
  if (!str.startsWith("\"") || !str.endsWith("\"")) return str;
  return str.substring(1, str.length - 1);
}

const start = async () => {
  let path = process.env.PWD;
  while (true) {
    if (fs.existsSync(path + "/package.json")) {
      break;
    }
    if (path.length < 10) {
      throw {message: "not found package.json"};
    }
    path = path.substring(0, path.lastIndexOf("/"));
  }

  const pkg = JSON.parse(await readFile(path + "/package.json"));
  if (
      !pkg.dependencies["react-native"] ||
      !pkg.dependencies["react-native-code-push"]
  ) {
    throw {message: "not a codepush env"};
  }

  let name = (await readDir(path + "/ios"))?.filter(v =>
      v.endsWith(".xcodeproj")
  )?.[0];
  name = name.substring(0, name.indexOf(".xcode"));

  const items = [];
  const project = new Xcode(path + `/ios/${name}.xcodeproj/project.pbxproj`);
  for (const tg of project.getTargets()) {
    const { buildSettings } = project.configuration.getTargetConfiguration(tg.name, "Release");
    let plistPath = path + "/ios/" + parseStr(buildSettings.INFOPLIST_FILE);
    plistPath = plistPath.replace(/\$\(SRCROOT\)\//g, "");

    const infoPlist = plist.parse(await readFile(plistPath));
    items.push({
      name: parseStr(tg.name),
      version: buildSettings.MARKETING_VERSION,
      codepushKey: infoPlist.CodePushDeploymentKey,
    });
  }

  console.log(JSON.stringify(items, null, 2));
};

start().catch(e => {
  console.warn(e);
  process.exit(1);
});
