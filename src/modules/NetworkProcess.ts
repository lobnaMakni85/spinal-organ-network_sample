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

import { ForgeFileItem } from "spinal-lib-forgefile";
import { InputData } from "./InputData/InputData";
import { NetworkService } from "spinal-model-bmsnetwork";
import { InputDataDevice } from "./InputData/InputDataModel/InputDataModel";

import { ConfigOrgan } from "../Utils/ConfigOrgan";

/**
 *
 *
 * @export
 * @class NetworkProcess
 */
export class NetworkProcess {
  private inputData: InputData;
  private nwService: NetworkService;

  /**
   *Creates an instance of NetworkProcess.
   * @param {InputData} inputData
   * @memberof NetworkProcess
   */
  constructor(inputData: InputData) {
    this.inputData = inputData;
    this.nwService = new NetworkService();
    this.nwService.setupDelay(0);
  }

  /**
   *
   *
   * @param {ForgeFileItem} forgeFile
   * @param {ConfigOrgan} configOrgan
   * @returns {Promise<void>}
   * @memberof NetworkProcess
   */
  public async init(
    forgeFile: ForgeFileItem,
    configOrgan: ConfigOrgan
  ): Promise<void> {
    await this.nwService.init(forgeFile, configOrgan);
    this.inputData.setOnDataCBFunc(this.updateData.bind(this));
  }

  /**
   *
   *
   * @param {InputDataDevice} obj
   * @memberof NetworkProcess
   */
  updateData(obj: InputDataDevice) {
    console.log("Update data device ! => ", obj.name);
    this.nwService.updateData.call(this.nwService, obj);
  }
}
