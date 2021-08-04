/*
 * Copyright 2018 SpinalCom - www.spinalcom.com
 *
 * This file is part of SpinalCore.
 *
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 *
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 *
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import { FileSystem, spinalCore } from "spinal-core-connectorjs_type";
import { ForgeFileItem } from "spinal-lib-forgefile";

require("json5/lib/register");
// get the config
const config = require("../config.json5");

import { InputData } from "./modules/InputData/InputData";
import { NetworkProcess } from "./modules/NetworkProcess";
import { getExcelToJSON } from "./Excel/LectureExcel";

// connection string to connect to spinalhub
const connectOpt = `http://${config.spinalConnector.user}:${config.spinalConnector.password
  }@${config.spinalConnector.host}:${config.spinalConnector.port}/`;

// initialize the connection
const conn = spinalCore.connect(connectOpt);

// get the Model from the spinalhub, "onLoadSuccess" and "onLoadError" are 2
// callback function.
spinalCore.load(conn, config.file.path, onLoadSuccess, onLoadError);

// called network error or file not found
function onLoadError() {
  console.log(`File does not exist in location ${config.file.path}`);
}

// called if connected to the server and if the spinalhub sent us the Model
async function onLoadSuccess(forgeFile: ForgeFileItem) {
  console.log("Connected to the server and got a the Entry Model");
  const links = config.links;

  for (const link of links) {
    const fichier = await getExcelToJSON(link);
    const organs = getOrgans(fichier);
    for (const etage of organs) {
      const inputData = new InputData(etage.data);
      const networkProcess = new NetworkProcess(inputData);
      await networkProcess.init(forgeFile, etage.config);
    }
  }

  // const inputData = new InputData();
  // const networkProcess = new NetworkProcess(inputData);

  // // reset data for test purpose
  // // if (typeof forgeFile.graph !== 'undefined') forgeFile.rem_attr('graph');

  // networkProcess.init(forgeFile, config.organ);
}


function getOrgans(fichier) {
  return Object.keys(fichier).map(el => {
    return {
      data: fichier[el],
      config: {
        contextName: config.organ.contextName,
        contextType: config.organ.contextType,
        networkType: config.organ.networkType,
        networkName: el
      }
    }
  });
}
