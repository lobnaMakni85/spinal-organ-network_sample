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

import {
	InputDataDevice,
	InputDataEndpoint,
	InputDataEndpointGroup,
	InputDataEndpointDataType,
	InputDataEndpointType
  } from "./InputDataModel/InputDataModel";
  
  import { getExcelToJSON } from "../../Excel/LectureExcel";
import { url } from "inspector";
  
  type onDataFunctionType = (obj: InputDataDevice) => void;
  const request = require('request');
  const axios = require('axios');
  const btoa = require('btoa');
  const utf8 = require('utf8');
  const iconv = require('iconv-lite');
  const q = require("q");
  const config = require("../../../config.json5")
  axios.interceptors.response.use(response => {
	let ctype = response.headers["content-type"];
	if (ctype.includes("charset=utf-16")) {
	  response.data = iconv.decode(response.data, 'utf-16');
	} return response;
  });
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  /**
   * Simulation Class to generate data from an extrenal source
   *
   * @class InputData
   */
  class InputData {
	/**
	 * @private
	 * @type {onDataFunctionType}
	 * @memberof InputData
	 */
	private onData: onDataFunctionType;
  
	/**
	 * @private
	 * @type {InputDataDevice[]}
	 * @memberof InputData
	 */
	private devices: InputDataDevice[];
	private token = null;
  
	/**
	 *Creates an instance of InputData.
	 * @memberof InputData
	 */
	constructor(etageData) {
  
	  this.devices = [];
	  this.onData = null;
	  this.init(etageData);
  
	}
  
  
	public async init(etageData) {
	  const intervalTest = 1000 * 60*5;
	  // const promises = config.links.map(link => {
	  //   try {
	  return this.generateData(etageData);
	  //   } catch (error) {
	  //     return {}
	  //   }
	  // });
  
	  // await Promise.all(promises)
  
	  setInterval(this.onDataInterval.bind(this), intervalTest);
	}
  
  
  
	/**
	 * @private
	 * @memberof InputData
	 */
	private async onDataInterval() {
	  console.log("update data")
	  if (this.onData !== null) {
		for (var i = 0; i <= this.devices.length - 1; i++) {
		  await this.updateDevice(this.devices[i])
		  this.onData(this.devices[i])
		}
	  }
	}
  
	/**
	 * @param {onDataFunctionType} onData
	 * @memberof InputData
	 */
	public setOnDataCBFunc(onData: onDataFunctionType): void {
	  this.onData = onData;
	  this.onDataInterval()
	}
  
	tokenProm = null;
	getToken() {
	  //console.log("gettoken");
	  if (this.tokenProm === null) {
		this.tokenProm = q.defer()
		console.log("new token");
		const CLIENT_SECRET = "83fb7073-2b01-4aa7-9874-b083e7af3eee";
		const CLIENT_ID = "WST";
		const token = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
		const options = {
		  url: 'https://10.22.20.13/OAuth/token',
		  method: 'post',
		  json: true,
		  headers: {
			'content-type': 'application/x-www-form-urlencoded',
			'Authorization': `Basic ${token}`
		  },
  
		  form: {
			grant_type: 'password',
			scope: "RealtimeData",
			username: 'backend',
			password: 'backend'
		  }
		}
		request(options, (error, response, body) => {
		  if (error) {
			console.error(error)
			const old = this.tokenProm
			old.reject(error)
			this.tokenProm = null
		  } else if (response.statusCode != 200) {
			const old = this.tokenProm
			old.reject(`Expected status code 200 but received ${response.statusCode}.`)
			this.tokenProm = null
			return;
		  } else {
			this.token = body;
			this.tokenProm.resolve(body)
		  }
		})
	  }
	  return this.tokenProm.promise;
	}
  
  
	tokenPromRefresh = null;
	getRefreshToken() {
	  console.log("access function refresh")
	  if (this.tokenPromRefresh === null) {
		this.tokenPromRefresh = q.defer()
		console.log("Refresh token");
		const CLIENT_SECRET = "83fb7073-2b01-4aa7-9874-b083e7af3eee";
		const CLIENT_ID = "WST";
		//const token = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
		const options = {
		  url: 'https://10.22.20.13/OAuth/token',
		  method: 'post',
		  json: true,
		  headers: {
			'content-type': 'application/x-www-form-urlencoded'
		  },
  
		  form: {
			grant_type: 'refresh_token',
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			refresh_token: this.token.refresh_token
  
		  }
		}
		request(options, (error, response, body) => {
		  if (response.statusCode != 200) {
  
			const old = this.tokenPromRefresh
			old.reject(`Expected status code 200 but received ${response.statusCode}.`)
			this.tokenPromRefresh = null
			return;
  
		  } else {
  
			this.token = body;
			console.log("refresh token:" + this.token.refresh_token)
			this.tokenPromRefresh.resolve(body)
			this.tokenPromRefresh = null
  
		  }
		})
	  }
	  return this.tokenPromRefresh.promise;
	}
  
	async fetchData(child: InputDataEndpoint) {
		if(this.token==null){
	  try {
  
		
		await this.getToken()
		
  
	  }
	  catch (e) {
  
		console.log(e);
	  }}

  else{
	  const t = this.token.access_token;
	  const options = {
		headers: {
		  'content-type': 'application/json; charset=utf-8',
		  'Authorization': `Bearer ${t}`
		},
		json: true,
		responseType: 'arraybuffer',
		reponseEncoding: 'binary'
	  };
	  try {
  
		const response = await axios.get(config.host + child.path, options)
  
		const j = JSON.parse(response.data);
  
		child.currentValue = j[Object.keys(j)[0]].value;
  
		console.log(child.currentValue)
  
	  }
	  catch (error) {
  
		if (error.response.status === 401) {
  
		  console.log("error 401")
		  await this.getRefreshToken()
		  return this.fetchData(child);
  
		}
		else {
		  console.error(error.response)
  
		}
	  }
	}
}
  
  
	/**
	 * @private
	 * @param {(InputDataDevice|InputDataEndpointGroup)} deviceOrEnpointGroup
	 * @memberof InputData
	 */
  
	private updateDevice(
	  deviceOrEnpointGroup: InputDataDevice | InputDataEndpointGroup
	): Promise<any> {
	  var device_id = deviceOrEnpointGroup.id;
	  console.log("update Devices", deviceOrEnpointGroup.id)
	  const promises = [];
	  for (const child of deviceOrEnpointGroup.children) {
		if (child instanceof InputDataEndpoint) {
		  promises.push(this.fetchData(child))
		} else if (child instanceof InputDataDevice || child instanceof InputDataEndpointGroup) {
  
		  this.updateDevice(child);
		}
	  }
  
	  return Promise.all(promises)
	}
  
  
	public async generateData(etageData) {
		const promises = Object.keys(etageData).map(key => this.generateDataByLevel(etageData[key],key));
		return Promise.all(promises);
		}
  
	public async generateDataByLevel(data,levelName) {
	  /*const levels = Object.keys(data);
	  for (const equimentName of levels) {
		this.generateEquimentData(equimentName, data[equimentName]);
	  }*/
	  this.generateEquimentData(levelName, data);
	}
  
	public generateEquimentData(equipementName, data) {
	  function createFunc(
		str: string,
		type: string,
		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	  ): any {
		return new constructor(str, type, str, "");
	  }
  
  
	  const res: InputDataDevice = createFunc(equipementName, "device", InputDataDevice);
  
	  data.forEach(element => {
		const child: InputDataEndpoint = new InputDataEndpoint(
		  element.Description,
		  this.getDefaultValue(element.Type),
		  element.Unit,
		  this.getDataType(element.Type),
		  InputDataEndpointType.Other,
		  element.Id,
		  element.url
		);
		res.children.push(child)
	  });
  
  
	  this.devices.push(res)
	  return res;
	}
  
  
  
	private getDataType(type) {
	  switch (type) {
		case "ATS":
		case "BIT":
		case "ALA":
		case "CMD":
		case "ACM":
		  return InputDataEndpointDataType.Boolean;
		case "CTV":
		  return InputDataEndpointDataType.Integer;
		case "REG":
		  return InputDataEndpointDataType.Double
		default:
		  break;
	  }
	}
  
	private getDefaultValue(type) {
	  switch (type) {
		case "ATS":
		case "BIT":
		case "ALA":
		case "CMD":
		case "ACM":
		  return true;
		case "CTV":
		  return 0;
		case "REG":
		  return 0;
		default:
		  break;
	  }
	}
  
	/*private getUnit(type) {
	  switch (type) {
		case "ATS":
		case "BIT":
		case "ALA":
		  return "";
		case "CTV":
		  return ";"
		case "REG":
		  return "KW";
		default:
		  break;
	  }
	}*/
  
	private concatVariables(object) {
	  return Object.keys(object).filter(el => el.toLowerCase().includes("variable")).filter(el3 => object[el3] && object[el3].length > 0).map(el2 => object[el2]).join("/");
	}
  
	// /**
	//  * @private
	//  * @memberof InputData
	//  */
	// private generateData() {
  
	// 	///TDS_040 ET TDS_050
	// 	var autom1 = ["B1/N01/CFO/TDS_050/IGN", "B1/N01/CFO/TDS_050/Synth_OF", "B1/N01/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(1, autom1, `TDS_050_N0`)
	// 	var autom2 = ["B1/N01/CFO/TDS_040/IGN", "B1/N01/CFO/TDS_040/Synth_OF", "B1/N01/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(1, autom2, `TDS_040_N0`)
	// 	autom1 = ["B1/N04/CFO/TDS_050/IGN", "B1/N04/CFO/TDS_050/Synth_OF", "B1/N04/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(4, autom1, `TDS_050_N0`)
	// 	autom2 = ["B1/N04/CFO/TDS_040/IGN", "B1/N04/CFO/TDS_040/Synth_OF", "B1/N04/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(4, autom2, `TDS_040_N0`)
	// 	autom1 = ["B1/N07/CFO/TDS_050/IGN", "B1/N07/CFO/TDS_050/Synth_OF", "B1/N07/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(7, autom1, `TDS_050_N0`)
	// 	autom2 = ["B1/N07/CFO/TDS_040/IGN", "B1/N07/CFO/TDS_040/Synth_OF", "B1/N07/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(7, autom2, `TDS_040_N0`)
	// 	autom1 = ["B1/N10/CFO/TDS_050/IGN", "B1/N10/CFO/TDS_050/Synth_OF", "B1/N10/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(10, autom1, `TDS_050_N`)
	// 	autom2 = ["B1/N10/CFO/TDS_040/IGN", "B1/N10/CFO/TDS_040/Synth_OF", "B1/N10/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(10, autom2, `TDS_040_N`)
	// 	autom1 = ["B1/N13/CFO/TDS_050/IGN", "B1/N13/CFO/TDS_050/Synth_OF", "B1/N13/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(13, autom1, `TDS_050_N`)
	// 	autom2 = ["B1/N13/CFO/TDS_040/IGN", "B1/N13/CFO/TDS_040/Synth_OF", "B1/N13/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(13, autom2, `TDS_040_N`)
	// 	autom1 = ["B1/N16/CFO/TDS_050/IGN", "B1/N16/CFO/TDS_050/Synth_OF", "B1/N16/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(16, autom1, `TDS_050_N`)
	// 	autom2 = ["B1/N16/CFO/TDS_040/IGN", "B1/N16/CFO/TDS_040/Synth_OF", "B1/N16/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(16, autom2, `TDS_040_N`)
	// 	autom1 = ["B1/N19/CFO/TDS_050/IGN", "B1/N19/CFO/TDS_050/Synth_OF", "B1/N19/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(19, autom1, `TDS_050_N`)
	// 	autom2 = ["B1/N19/CFO/TDS_040/IGN", "B1/N19/CFO/TDS_040/Synth_OF", "B1/N19/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(19, autom2, `TDS_040_N`)
	// 	autom1 = ["B1/N22/CFO/TDS_050/IGN", "B1/N22/CFO/TDS_050/Synth_OF", "B1/N22/CFO/TDS_050/Synth_SD"];
	// 	this.generateDataTDS(22, autom1, `TDS_050_N`)
	// 	autom2 = ["B1/N22/CFO/TDS_040/IGN", "B1/N22/CFO/TDS_040/Synth_OF", "B1/N22/CFO/TDS_040/Synth_SD"];
	// 	this.generateDataTDS(22, autom2, `TDS_040_N`)
  
	// 	////////////////////////////TDP_010  
  
	// 	autom1 = ["B1/N03/CFO/TDP_010/IGN", "B1/N03/CFO/TDP_010/IDEL", "B1/N03/CFO/TDP_010/Synth_SD",
	// 		"B1/N03/CFO/TDP_010/PT", "B1/N03/CFO/TDP_010/COM", "B1/N03/CFO/TDP_010/CPT/CVC",
	// 		"B1/N03/CFO/TDP_010/CPT/Ecl", "B1/N03/CFO/TDP_010/CPT/General", "B1/N03/CFO/TDP_010/CPT/PC",
	// 		"B1/N03/CFO/TDP_010/ECL_1_3/TC", "B1/N03/CFO/TDP_010/ECL_1_3/TS", "B1/N03/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N03/CFO/TDP_010/ECL_2_3/TC", "B1/N03/CFO/TDP_010/ECL_2_3/TS", "B1/N03/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(3, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N04/CFO/TDP_010/IGN", "B1/N04/CFO/TDP_010/IDEL", "B1/N04/CFO/TDP_010/Synth_SD",
	// 		"B1/N04/CFO/TDP_010/PT", "B1/N04/CFO/TDP_010/COM", "B1/N04/CFO/TDP_010/CPT/CVC",
	// 		"B1/N04/CFO/TDP_010/CPT/Ecl", "B1/N04/CFO/TDP_010/CPT/General", "B1/N04/CFO/TDP_010/CPT/PC",
	// 		"B1/N04/CFO/TDP_010/ECL_1_3/TC", "B1/N04/CFO/TDP_010/ECL_1_3/TS", "B1/N04/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N04/CFO/TDP_010/ECL_2_3/TC", "B1/N04/CFO/TDP_010/ECL_2_3/TS", "B1/N04/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(4, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N05/CFO/TDP_010/IGN", "B1/N05/CFO/TDP_010/IDEL", "B1/N05/CFO/TDP_010/Synth_SD",
	// 		"B1/N05/CFO/TDP_010/PT", "B1/N05/CFO/TDP_010/COM", "B1/N05/CFO/TDP_010/CPT/CVC",
	// 		"B1/N05/CFO/TDP_010/CPT/Ecl", "B1/N05/CFO/TDP_010/CPT/General", "B1/N05/CFO/TDP_010/CPT/PC",
	// 		"B1/N05/CFO/TDP_010/ECL_1_3/TC", "B1/N05/CFO/TDP_010/ECL_1_3/TS", "B1/N05/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N05/CFO/TDP_010/ECL_2_3/TC", "B1/N05/CFO/TDP_010/ECL_2_3/TS", "B1/N05/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(5, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N07/CFO/TDP_010/IGN", "B1/N07/CFO/TDP_010/IDEL", "B1/N07/CFO/TDP_010/Synth_SD",
	// 		"B1/N07/CFO/TDP_010/PT", "B1/N07/CFO/TDP_010/COM", "B1/N07/CFO/TDP_010/CPT/CVC",
	// 		"B1/N07/CFO/TDP_010/CPT/Ecl", "B1/N07/CFO/TDP_010/CPT/General", "B1/N07/CFO/TDP_010/CPT/PC",
	// 		"B1/N07/CFO/TDP_010/ECL_1_3/TC", "B1/N07/CFO/TDP_010/ECL_1_3/TS", "B1/N07/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N07/CFO/TDP_010/ECL_2_3/TC", "B1/N07/CFO/TDP_010/ECL_2_3/TS", "B1/N07/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(7, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N08/CFO/TDP_010/IGN", "B1/N08/CFO/TDP_010/IDEL", "B1/N08/CFO/TDP_010/Synth_SD",
	// 		"B1/N08/CFO/TDP_010/PT", "B1/N08/CFO/TDP_010/COM", "B1/N08/CFO/TDP_010/CPT/CVC",
	// 		"B1/N08/CFO/TDP_010/CPT/Ecl", "B1/N08/CFO/TDP_010/CPT/General", "B1/N08/CFO/TDP_010/CPT/PC",
	// 		"B1/N08/CFO/TDP_010/ECL_1_3/TC", "B1/N08/CFO/TDP_010/ECL_1_3/TS", "B1/N08/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N08/CFO/TDP_010/ECL_2_3/TC", "B1/N08/CFO/TDP_010/ECL_2_3/TS", "B1/N08/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(8, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N10/CFO/TDP_010/IGN", "B1/N10/CFO/TDP_010/IDEL", "B1/N10/CFO/TDP_010/Synth_SD",
	// 		"B1/N10/CFO/TDP_010/PT", "B1/N10/CFO/TDP_010/COM", "B1/N10/CFO/TDP_010/CPT/CVC",
	// 		"B1/N10/CFO/TDP_010/CPT/Ecl", "B1/N10/CFO/TDP_010/CPT/General", "B1/N10/CFO/TDP_010/CPT/PC",
	// 		"B1/N10/CFO/TDP_010/ECL_1_3/TC", "B1/N10/CFO/TDP_010/ECL_1_3/TS", "B1/N10/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N10/CFO/TDP_010/ECL_2_3/TC", "B1/N10/CFO/TDP_010/ECL_2_3/TS", "B1/N10/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(10, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N11/CFO/TDP_010/IGN", "B1/N11/CFO/TDP_010/IDEL", "B1/N11/CFO/TDP_010/Synth_SD",
	// 		"B1/N11/CFO/TDP_010/PT", "B1/N11/CFO/TDP_010/COM", "B1/N11/CFO/TDP_010/CPT/CVC",
	// 		"B1/N11/CFO/TDP_010/CPT/Ecl", "B1/N11/CFO/TDP_010/CPT/General", "B1/N11/CFO/TDP_010/CPT/PC",
	// 		"B1/N11/CFO/TDP_010/ECL_1_3/TC", "B1/N11/CFO/TDP_010/ECL_1_3/TS", "B1/N11/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N11/CFO/TDP_010/ECL_2_3/TC", "B1/N11/CFO/TDP_010/ECL_2_3/TS", "B1/N11/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(11, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N12/CFO/TDP_010/IGN", "B1/N12/CFO/TDP_010/IDEL", "B1/N12/CFO/TDP_010/Synth_SD",
	// 		"B1/N12/CFO/TDP_010/PT", "B1/N12/CFO/TDP_010/COM", "B1/N12/CFO/TDP_010/CPT/CVC",
	// 		"B1/N12/CFO/TDP_010/CPT/Ecl", "B1/N12/CFO/TDP_010/CPT/General", "B1/N12/CFO/TDP_010/CPT/PC",
	// 		"B1/N12/CFO/TDP_010/ECL_1_3/TC", "B1/N12/CFO/TDP_010/ECL_1_3/TS", "B1/N12/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N12/CFO/TDP_010/ECL_2_3/TC", "B1/N12/CFO/TDP_010/ECL_2_3/TS", "B1/N12/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(12, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N13/CFO/TDP_010/IGN", "B1/N13/CFO/TDP_010/IDEL", "B1/N13/CFO/TDP_010/Synth_SD",
	// 		"B1/N13/CFO/TDP_010/PT", "B1/N13/CFO/TDP_010/COM", "B1/N13/CFO/TDP_010/CPT/CVC",
	// 		"B1/N13/CFO/TDP_010/CPT/Ecl", "B1/N13/CFO/TDP_010/CPT/General", "B1/N13/CFO/TDP_010/CPT/PC",
	// 		"B1/N13/CFO/TDP_010/ECL_1_3/TC", "B1/N13/CFO/TDP_010/ECL_1_3/TS", "B1/N13/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N13/CFO/TDP_010/ECL_2_3/TC", "B1/N13/CFO/TDP_010/ECL_2_3/TS", "B1/N13/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(13, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N14/CFO/TDP_010/IGN", "B1/N14/CFO/TDP_010/IDEL", "B1/N14/CFO/TDP_010/Synth_SD",
	// 		"B1/N14/CFO/TDP_010/PT", "B1/N14/CFO/TDP_010/COM", "B1/N14/CFO/TDP_010/CPT/CVC",
	// 		"B1/N14/CFO/TDP_010/CPT/Ecl", "B1/N14/CFO/TDP_010/CPT/General", "B1/N14/CFO/TDP_010/CPT/PC",
	// 		"B1/N14/CFO/TDP_010/ECL_1_3/TC", "B1/N14/CFO/TDP_010/ECL_1_3/TS", "B1/N14/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N14/CFO/TDP_010/ECL_2_3/TC", "B1/N14/CFO/TDP_010/ECL_2_3/TS", "B1/N14/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(14, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N15/CFO/TDP_010/IGN", "B1/N15/CFO/TDP_010/IDEL", "B1/N15/CFO/TDP_010/Synth_SD",
	// 		"B1/N15/CFO/TDP_010/PT", "B1/N15/CFO/TDP_010/COM", "B1/N15/CFO/TDP_010/CPT/CVC",
	// 		"B1/N15/CFO/TDP_010/CPT/Ecl", "B1/N15/CFO/TDP_010/CPT/General", "B1/N15/CFO/TDP_010/CPT/PC",
	// 		"B1/N15/CFO/TDP_010/ECL_1_3/TC", "B1/N15/CFO/TDP_010/ECL_1_3/TS", "B1/N15/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N15/CFO/TDP_010/ECL_2_3/TC", "B1/N15/CFO/TDP_010/ECL_2_3/TS", "B1/N15/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(15, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N16/CFO/TDP_010/IGN", "B1/N16/CFO/TDP_010/IDEL", "B1/N16/CFO/TDP_010/Synth_SD",
	// 		"B1/N16/CFO/TDP_010/PT", "B1/N16/CFO/TDP_010/COM", "B1/N16/CFO/TDP_010/CPT/CVC",
	// 		"B1/N16/CFO/TDP_010/CPT/Ecl", "B1/N16/CFO/TDP_010/CPT/General", "B1/N16/CFO/TDP_010/CPT/PC",
	// 		"B1/N16/CFO/TDP_010/ECL_1_3/TC", "B1/N16/CFO/TDP_010/ECL_1_3/TS", "B1/N16/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N16/CFO/TDP_010/ECL_2_3/TC", "B1/N16/CFO/TDP_010/ECL_2_3/TS", "B1/N16/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(16, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N17/CFO/TDP_010/IGN", "B1/N17/CFO/TDP_010/IDEL", "B1/N17/CFO/TDP_010/Synth_SD",
	// 		"B1/N17/CFO/TDP_010/PT", "B1/N17/CFO/TDP_010/COM", "B1/N17/CFO/TDP_010/CPT/CVC",
	// 		"B1/N17/CFO/TDP_010/CPT/Ecl", "B1/N17/CFO/TDP_010/CPT/General", "B1/N17/CFO/TDP_010/CPT/PC",
	// 		"B1/N17/CFO/TDP_010/ECL_1_3/TC", "B1/N17/CFO/TDP_010/ECL_1_3/TS", "B1/N17/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N17/CFO/TDP_010/ECL_2_3/TC", "B1/N17/CFO/TDP_010/ECL_2_3/TS", "B1/N17/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(17, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N18/CFO/TDP_010/IGN", "B1/N18/CFO/TDP_010/IDEL", "B1/N18/CFO/TDP_010/Synth_SD",
	// 		"B1/N18/CFO/TDP_010/PT", "B1/N18/CFO/TDP_010/COM", "B1/N18/CFO/TDP_010/CPT/CVC",
	// 		"B1/N18/CFO/TDP_010/CPT/Ecl", "B1/N18/CFO/TDP_010/CPT/General", "B1/N18/CFO/TDP_010/CPT/PC",
	// 		"B1/N18/CFO/TDP_010/ECL_1_3/TC", "B1/N18/CFO/TDP_010/ECL_1_3/TS", "B1/N18/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N18/CFO/TDP_010/ECL_2_3/TC", "B1/N18/CFO/TDP_010/ECL_2_3/TS", "B1/N18/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(18, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N19/CFO/TDP_010/IGN", "B1/N19/CFO/TDP_010/IDEL", "B1/N19/CFO/TDP_010/Synth_SD",
	// 		"B1/N19/CFO/TDP_010/PT", "B1/N19/CFO/TDP_010/COM", "B1/N19/CFO/TDP_010/CPT/CVC",
	// 		"B1/N19/CFO/TDP_010/CPT/Ecl", "B1/N19/CFO/TDP_010/CPT/General", "B1/N19/CFO/TDP_010/CPT/PC",
	// 		"B1/N19/CFO/TDP_010/ECL_1_3/TC", "B1/N19/CFO/TDP_010/ECL_1_3/TS", "B1/N19/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N19/CFO/TDP_010/ECL_2_3/TC", "B1/N19/CFO/TDP_010/ECL_2_3/TS", "B1/N19/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP(19, autom1, `TDP_010_N`)
  
	// 	/////////////////////////////////////////////////
  
	// 	autom1 = ["B1/N02/CFO/TDP_010/IGN", "B1/N02/CFO/TDP_010/IDEL", "B1/N02/CFO/TDP_010/Synth_SD",
	// 		"B1/N02/CFO/TDP_010/PT", "B1/N02/CFO/TDP_010/COM", "B1/N02/CFO/TDP_010/CPT/CVC",
	// 		"B1/N02/CFO/TDP_010/CPT/Ecl", "B1/N02/CFO/TDP_010/CPT/General", "B1/N02/CFO/TDP_010/CPT/PC",
	// 		"B1/N02/CFO/TDP_010/ECL_1_3/TC", "B1/N02/CFO/TDP_010/ECL_1_3/TS", "B1/N02/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N02/CFO/TDP_010/ECL_2_3/TC", "B1/N02/CFO/TDP_010/ECL_2_3/TS", "B1/N02/CFO/TDP_010/ECL_2_3/PH",
	// 		"B1/N02/CFO/TDP_010/ECL_TERRASSE/TC", "B1/N02/CFO/TDP_010/ECL_TERRASSE/TS", "B1/N02/CFO/TDP_010/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(2, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N09/CFO/TDP_010/IGN", "B1/N09/CFO/TDP_010/IDEL", "B1/N09/CFO/TDP_010/Synth_SD",
	// 		"B1/N09/CFO/TDP_010/PT", "B1/N09/CFO/TDP_010/COM", "B1/N09/CFO/TDP_010/CPT/CVC",
	// 		"B1/N09/CFO/TDP_010/CPT/Ecl", "B1/N09/CFO/TDP_010/CPT/General", "B1/N09/CFO/TDP_010/CPT/PC",
	// 		"B1/N09/CFO/TDP_010/ECL_1_3/TC", "B1/N09/CFO/TDP_010/ECL_1_3/TS", "B1/N09/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N09/CFO/TDP_010/ECL_2_3/TC", "B1/N09/CFO/TDP_010/ECL_2_3/TS", "B1/N09/CFO/TDP_010/ECL_2_3/PH",
	// 		"B1/N09/CFO/TDP_010/ECL_TERRASSE/TC", "B1/N09/CFO/TDP_010/ECL_TERRASSE/TS", "B1/N09/CFO/TDP_010/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(9, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N20/CFO/TDP_010/IGN", "B1/N20/CFO/TDP_010/IDEL", "B1/N20/CFO/TDP_010/Synth_SD",
	// 		"B1/N20/CFO/TDP_010/PT", "B1/N20/CFO/TDP_010/COM", "B1/N20/CFO/TDP_010/CPT/CVC",
	// 		"B1/N20/CFO/TDP_010/CPT/Ecl", "B1/N20/CFO/TDP_010/CPT/General", "B1/N20/CFO/TDP_010/CPT/PC",
	// 		"B1/N20/CFO/TDP_010/ECL_1_3/TC", "B1/N20/CFO/TDP_010/ECL_1_3/TS", "B1/N20/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N20/CFO/TDP_010/ECL_2_3/TC", "B1/N20/CFO/TDP_010/ECL_2_3/TS", "B1/N20/CFO/TDP_010/ECL_2_3/PH",
	// 		"B1/N20/CFO/TDP_010/ECL_TERRASSE/TC", "B1/N20/CFO/TDP_010/ECL_TERRASSE/TS", "B1/N20/CFO/TDP_010/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(20, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N21/CFO/TDP_010/IGN", "B1/N21/CFO/TDP_010/IDEL", "B1/N21/CFO/TDP_010/Synth_SD",
	// 		"B1/N21/CFO/TDP_010/PT", "B1/N21/CFO/TDP_010/COM", "B1/N21/CFO/TDP_010/CPT/CVC",
	// 		"B1/N21/CFO/TDP_010/CPT/Ecl", "B1/N21/CFO/TDP_010/CPT/General", "B1/N21/CFO/TDP_010/CPT/PC",
	// 		"B1/N21/CFO/TDP_010/ECL_1_3/TC", "B1/N21/CFO/TDP_010/ECL_1_3/TS", "B1/N21/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N21/CFO/TDP_010/ECL_2_3/TC", "B1/N21/CFO/TDP_010/ECL_2_3/TS", "B1/N21/CFO/TDP_010/ECL_2_3/PH",
	// 		"B1/N21/CFO/TDP_010/ECL_TERRASSE/TC", "B1/N21/CFO/TDP_010/ECL_TERRASSE/TS", "B1/N21/CFO/TDP_010/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(21, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N22/CFO/TDP_010/IGN", "B1/N22/CFO/TDP_010/IDEL", "B1/N22/CFO/TDP_010/Synth_SD",
	// 		"B1/N22/CFO/TDP_010/PT", "B1/N22/CFO/TDP_010/COM", "B1/N22/CFO/TDP_010/CPT/CVC",
	// 		"B1/N22/CFO/TDP_010/CPT/Ecl", "B1/N22/CFO/TDP_010/CPT/General", "B1/N22/CFO/TDP_010/CPT/PC",
	// 		"B1/N22/CFO/TDP_010/ECL_1_3/TC", "B1/N22/CFO/TDP_010/ECL_1_3/TS", "B1/N22/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N22/CFO/TDP_010/ECL_2_3/TC", "B1/N22/CFO/TDP_010/ECL_2_3/TS", "B1/N22/CFO/TDP_010/ECL_2_3/PH",
	// 		"B1/N22/CFO/TDP_010/ECL_TERRASSE/TC", "B1/N22/CFO/TDP_010/ECL_TERRASSE/TS", "B1/N22/CFO/TDP_010/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(22, autom1, `TDP_010_N`)
  
	// 	autom1 = ["B1/N02/CFO/TDP_020/IGN", "B1/N02/CFO/TDP_020/IDEL", "B1/N02/CFO/TDP_020/Synth_SD",
	// 		"B1/N02/CFO/TDP_020/PT", "B1/N02/CFO/TDP_020/COM", "B1/N02/CFO/TDP_020/CPT/CVC",
	// 		"B1/N02/CFO/TDP_020/CPT/Ecl", "B1/N02/CFO/TDP_020/CPT/General", "B1/N02/CFO/TDP_020/CPT/PC",
	// 		"B1/N02/CFO/TDP_020/ECL_1_3/TC", "B1/N02/CFO/TDP_020/ECL_1_3/TS", "B1/N02/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N02/CFO/TDP_020/ECL_2_3/TC", "B1/N02/CFO/TDP_020/ECL_2_3/TS", "B1/N02/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N02/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N02/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N02/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(2, autom1, `TDP_020_N0`)
  
	// 	autom1 = ["B1/N04/CFO/TDP_020/IGN", "B1/N04/CFO/TDP_020/IDEL", "B1/N04/CFO/TDP_020/Synth_SD",
	// 		"B1/N04/CFO/TDP_020/PT", "B1/N04/CFO/TDP_020/COM", "B1/N04/CFO/TDP_020/CPT/CVC",
	// 		"B1/N04/CFO/TDP_020/CPT/Ecl", "B1/N04/CFO/TDP_020/CPT/General", "B1/N04/CFO/TDP_020/CPT/PC",
	// 		"B1/N04/CFO/TDP_020/ECL_1_3/TC", "B1/N04/CFO/TDP_020/ECL_1_3/TS", "B1/N04/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N04/CFO/TDP_020/ECL_2_3/TC", "B1/N04/CFO/TDP_020/ECL_2_3/TS", "B1/N04/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N04/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N04/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N04/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(4, autom1, `TDP_020_N0`)
  
	// 	autom1 = ["B1/N05/CFO/TDP_020/IGN", "B1/N05/CFO/TDP_020/IDEL", "B1/N05/CFO/TDP_020/Synth_SD",
	// 		"B1/N05/CFO/TDP_020/PT", "B1/N05/CFO/TDP_020/COM", "B1/N05/CFO/TDP_020/CPT/CVC",
	// 		"B1/N05/CFO/TDP_020/CPT/Ecl", "B1/N05/CFO/TDP_020/CPT/General", "B1/N05/CFO/TDP_020/CPT/PC",
	// 		"B1/N05/CFO/TDP_020/ECL_1_3/TC", "B1/N05/CFO/TDP_020/ECL_1_3/TS", "B1/N05/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N05/CFO/TDP_020/ECL_2_3/TC", "B1/N05/CFO/TDP_020/ECL_2_3/TS", "B1/N05/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N05/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N05/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N05/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(5, autom1, `TDP_020_N0`)
  
	// 	autom1 = ["B1/N06/CFO/TDP_010/IGN", "B1/N06/CFO/TDP_010/IDEL", "B1/N06/CFO/TDP_010/Synth_SD",
	// 		"B1/N06/CFO/TDP_010/PT", "B1/N06/CFO/TDP_010/COM", "B1/N06/CFO/TDP_010/CPT/CVC",
	// 		"B1/N06/CFO/TDP_010/CPT/Ecl", "B1/N06/CFO/TDP_010/CPT/General", "B1/N06/CFO/TDP_010/CPT/PC",
	// 		"B1/N06/CFO/TDP_010/ECL_1_3/TC", "B1/N06/CFO/TDP_010/ECL_1_3/TS", "B1/N06/CFO/TDP_010/ECL_1_3/PH",
	// 		"B1/N06/CFO/TDP_010/ECL_2_3/TC", "B1/N06/CFO/TDP_010/ECL_2_3/TS", "B1/N06/CFO/TDP_010/ECL_2_3/PH",
	// 		"B1/N06/CFO/TDP_010/ECL_TERRASSE/TC", "B1/N06/CFO/TDP_010/ECL_TERRASSE/TS", "B1/N06/CFO/TDP_010/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(6, autom1, `TDP_010_N0`)
  
	// 	autom1 = ["B1/N07/CFO/TDP_020/IGN", "B1/N07/CFO/TDP_020/IDEL", "B1/N07/CFO/TDP_020/Synth_SD",
	// 		"B1/N07/CFO/TDP_020/PT", "B1/N07/CFO/TDP_020/COM", "B1/N07/CFO/TDP_020/CPT/CVC",
	// 		"B1/N07/CFO/TDP_020/CPT/Ecl", "B1/N07/CFO/TDP_020/CPT/General", "B1/N07/CFO/TDP_020/CPT/PC",
	// 		"B1/N07/CFO/TDP_020/ECL_1_3/TC", "B1/N07/CFO/TDP_020/ECL_1_3/TS", "B1/N07/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N07/CFO/TDP_020/ECL_2_3/TC", "B1/N07/CFO/TDP_020/ECL_2_3/TS", "B1/N07/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N07/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N07/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N07/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(7, autom1, `TDP_020_N0`)
  
	// 	autom1 = ["B1/N08/CFO/TDP_020/IGN", "B1/N08/CFO/TDP_020/IDEL", "B1/N08/CFO/TDP_020/Synth_SD",
	// 		"B1/N08/CFO/TDP_020/PT", "B1/N08/CFO/TDP_020/COM", "B1/N08/CFO/TDP_020/CPT/CVC",
	// 		"B1/N08/CFO/TDP_020/CPT/Ecl", "B1/N08/CFO/TDP_020/CPT/General", "B1/N08/CFO/TDP_020/CPT/PC",
	// 		"B1/N08/CFO/TDP_020/ECL_1_3/TC", "B1/N08/CFO/TDP_020/ECL_1_3/TS", "B1/N08/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N08/CFO/TDP_020/ECL_2_3/TC", "B1/N08/CFO/TDP_020/ECL_2_3/TS", "B1/N08/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N08/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N08/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N08/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(8, autom1, `TDP_020_N0`)
  
	// 	autom1 = ["B1/N10/CFO/TDP_020/IGN", "B1/N10/CFO/TDP_020/IDEL", "B1/N10/CFO/TDP_020/Synth_SD",
	// 		"B1/N10/CFO/TDP_020/PT", "B1/N10/CFO/TDP_020/COM", "B1/N10/CFO/TDP_020/CPT/CVC",
	// 		"B1/N10/CFO/TDP_020/CPT/Ecl", "B1/N10/CFO/TDP_020/CPT/General", "B1/N10/CFO/TDP_020/CPT/PC",
	// 		"B1/N10/CFO/TDP_020/ECL_1_3/TC", "B1/N10/CFO/TDP_020/ECL_1_3/TS", "B1/N10/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N10/CFO/TDP_020/ECL_2_3/TC", "B1/N10/CFO/TDP_020/ECL_2_3/TS", "B1/N10/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N10/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N10/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N10/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(10, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N12/CFO/TDP_020/IGN", "B1/N12/CFO/TDP_020/IDEL", "B1/N12/CFO/TDP_020/Synth_SD",
	// 		"B1/N12/CFO/TDP_020/PT", "B1/N12/CFO/TDP_020/COM", "B1/N12/CFO/TDP_020/CPT/CVC",
	// 		"B1/N12/CFO/TDP_020/CPT/Ecl", "B1/N12/CFO/TDP_020/CPT/General", "B1/N12/CFO/TDP_020/CPT/PC",
	// 		"B1/N12/CFO/TDP_020/ECL_1_3/TC", "B1/N12/CFO/TDP_020/ECL_1_3/TS", "B1/N12/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N12/CFO/TDP_020/ECL_2_3/TC", "B1/N12/CFO/TDP_020/ECL_2_3/TS", "B1/N12/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N12/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N12/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N12/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(12, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N14/CFO/TDP_020/IGN", "B1/N14/CFO/TDP_020/IDEL", "B1/N14/CFO/TDP_020/Synth_SD",
	// 		"B1/N14/CFO/TDP_020/PT", "B1/N14/CFO/TDP_020/COM", "B1/N14/CFO/TDP_020/CPT/CVC",
	// 		"B1/N14/CFO/TDP_020/CPT/Ecl", "B1/N14/CFO/TDP_020/CPT/General", "B1/N14/CFO/TDP_020/CPT/PC",
	// 		"B1/N14/CFO/TDP_020/ECL_1_3/TC", "B1/N14/CFO/TDP_020/ECL_1_3/TS", "B1/N14/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N14/CFO/TDP_020/ECL_2_3/TC", "B1/N14/CFO/TDP_020/ECL_2_3/TS", "B1/N14/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N14/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N14/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N14/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(14, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N15/CFO/TDP_020/IGN", "B1/N15/CFO/TDP_020/IDEL", "B1/N15/CFO/TDP_020/Synth_SD",
	// 		"B1/N15/CFO/TDP_020/PT", "B1/N15/CFO/TDP_020/COM", "B1/N15/CFO/TDP_020/CPT/CVC",
	// 		"B1/N15/CFO/TDP_020/CPT/Ecl", "B1/N15/CFO/TDP_020/CPT/General", "B1/N15/CFO/TDP_020/CPT/PC",
	// 		"B1/N15/CFO/TDP_020/ECL_1_3/TC", "B1/N15/CFO/TDP_020/ECL_1_3/TS", "B1/N15/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N15/CFO/TDP_020/ECL_2_3/TC", "B1/N15/CFO/TDP_020/ECL_2_3/TS", "B1/N15/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N15/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N15/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N15/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(15, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N16/CFO/TDP_020/IGN", "B1/N16/CFO/TDP_020/IDEL", "B1/N16/CFO/TDP_020/Synth_SD",
	// 		"B1/N16/CFO/TDP_020/PT", "B1/N16/CFO/TDP_020/COM", "B1/N16/CFO/TDP_020/CPT/CVC",
	// 		"B1/N16/CFO/TDP_020/CPT/Ecl", "B1/N16/CFO/TDP_020/CPT/General", "B1/N16/CFO/TDP_020/CPT/PC",
	// 		"B1/N16/CFO/TDP_020/ECL_1_3/TC", "B1/N16/CFO/TDP_020/ECL_1_3/TS", "B1/N16/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N16/CFO/TDP_020/ECL_2_3/TC", "B1/N16/CFO/TDP_020/ECL_2_3/TS", "B1/N16/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N16/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N16/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N16/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(16, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N17/CFO/TDP_020/IGN", "B1/N17/CFO/TDP_020/IDEL", "B1/N17/CFO/TDP_020/Synth_SD",
	// 		"B1/N17/CFO/TDP_020/PT", "B1/N17/CFO/TDP_020/COM", "B1/N17/CFO/TDP_020/CPT/CVC",
	// 		"B1/N17/CFO/TDP_020/CPT/Ecl", "B1/N17/CFO/TDP_020/CPT/General", "B1/N17/CFO/TDP_020/CPT/PC",
	// 		"B1/N17/CFO/TDP_020/ECL_1_3/TC", "B1/N17/CFO/TDP_020/ECL_1_3/TS", "B1/N17/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N17/CFO/TDP_020/ECL_2_3/TC", "B1/N17/CFO/TDP_020/ECL_2_3/TS", "B1/N17/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N17/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N17/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N17/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(17, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N18/CFO/TDP_020/IGN", "B1/N18/CFO/TDP_020/IDEL", "B1/N18/CFO/TDP_020/Synth_SD",
	// 		"B1/N18/CFO/TDP_020/PT", "B1/N18/CFO/TDP_020/COM", "B1/N18/CFO/TDP_020/CPT/CVC",
	// 		"B1/N18/CFO/TDP_020/CPT/Ecl", "B1/N18/CFO/TDP_020/CPT/General", "B1/N18/CFO/TDP_020/CPT/PC",
	// 		"B1/N18/CFO/TDP_020/ECL_1_3/TC", "B1/N18/CFO/TDP_020/ECL_1_3/TS", "B1/N18/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N18/CFO/TDP_020/ECL_2_3/TC", "B1/N18/CFO/TDP_020/ECL_2_3/TS", "B1/N18/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N18/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N18/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N18/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(18, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N19/CFO/TDP_020/IGN", "B1/N19/CFO/TDP_020/IDEL", "B1/N19/CFO/TDP_020/Synth_SD",
	// 		"B1/N19/CFO/TDP_020/PT", "B1/N19/CFO/TDP_020/COM", "B1/N19/CFO/TDP_020/CPT/CVC",
	// 		"B1/N19/CFO/TDP_020/CPT/Ecl", "B1/N19/CFO/TDP_020/CPT/General", "B1/N19/CFO/TDP_020/CPT/PC",
	// 		"B1/N19/CFO/TDP_020/ECL_1_3/TC", "B1/N19/CFO/TDP_020/ECL_1_3/TS", "B1/N19/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N19/CFO/TDP_020/ECL_2_3/TC", "B1/N19/CFO/TDP_020/ECL_2_3/TS", "B1/N19/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N19/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N19/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N19/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(19, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N21/CFO/TDP_020/IGN", "B1/N21/CFO/TDP_020/IDEL", "B1/N21/CFO/TDP_020/Synth_SD",
	// 		"B1/N21/CFO/TDP_020/PT", "B1/N21/CFO/TDP_020/COM", "B1/N21/CFO/TDP_020/CPT/CVC",
	// 		"B1/N21/CFO/TDP_020/CPT/Ecl", "B1/N21/CFO/TDP_020/CPT/General", "B1/N21/CFO/TDP_020/CPT/PC",
	// 		"B1/N21/CFO/TDP_020/ECL_1_3/TC", "B1/N21/CFO/TDP_020/ECL_1_3/TS", "B1/N21/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N21/CFO/TDP_020/ECL_2_3/TC", "B1/N21/CFO/TDP_020/ECL_2_3/TS", "B1/N21/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N21/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N21/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N21/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(21, autom1, `TDP_020_N`)
  
	// 	autom1 = ["B1/N22/CFO/TDP_020/IGN", "B1/N22/CFO/TDP_020/IDEL", "B1/N22/CFO/TDP_020/Synth_SD",
	// 		"B1/N22/CFO/TDP_020/PT", "B1/N22/CFO/TDP_020/COM", "B1/N22/CFO/TDP_020/CPT/CVC",
	// 		"B1/N22/CFO/TDP_020/CPT/Ecl", "B1/N22/CFO/TDP_020/CPT/General", "B1/N22/CFO/TDP_020/CPT/PC",
	// 		"B1/N22/CFO/TDP_020/ECL_1_3/TC", "B1/N22/CFO/TDP_020/ECL_1_3/TS", "B1/N22/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N22/CFO/TDP_020/ECL_2_3/TC", "B1/N22/CFO/TDP_020/ECL_2_3/TS", "B1/N22/CFO/TDP_020/ECL_2_3/PH",
	// 		"B1/N22/CFO/TDP_020/ECL_TERRASSE/TC", "B1/N22/CFO/TDP_020/ECL_TERRASSE/TS", "B1/N22/CFO/TDP_020/ECL_TERRASSE/PH"];
	// 	this.generateDataTDP_ECL_TER(22, autom1, `TDP_020_N`)
  
	// 	///////////////////////////TDP_020 
  
	// 	autom2 = ["B1/N03/CFO/TDP_020/IGN", "B1/N03/CFO/TDP_020/IDEL", "B1/N03/CFO/TDP_020/Synth_SD",
	// 		"B1/N03/CFO/TDP_020/PT", "B1/N03/CFO/TDP_020/COM", "B1/N03/CFO/TDP_020/CPT/CVC",
	// 		"B1/N03/CFO/TDP_020/CPT/Ecl", "B1/N03/CFO/TDP_020/CPT/General", "B1/N03/CFO/TDP_020/CPT/PC",
	// 		"B1/N03/CFO/TDP_020/ECL_1_3/TC", "B1/N03/CFO/TDP_020/ECL_1_3/TS", "B1/N03/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N03/CFO/TDP_020/ECL_2_3/TC", "B1/N03/CFO/TDP_020/ECL_2_3/TS", "B1/N03/CFO/TDP_020/ECL_2_3/PH"];
	// 	this.generateDataTDP(3, autom2, `TDP_020_N0`)
  
	// 	autom2 = ["B1/N06/CFO/TDP_020/IGN", "B1/N06/CFO/TDP_020/IDEL", "B1/N06/CFO/TDP_020/Synth_SD",
	// 		"B1/N06/CFO/TDP_020/PT", "B1/N06/CFO/TDP_020/COM", "B1/N06/CFO/TDP_020/CPT/CVC",
	// 		"B1/N06/CFO/TDP_020/CPT/Ecl", "B1/N06/CFO/TDP_020/CPT/General", "B1/N06/CFO/TDP_020/CPT/PC",
	// 		"B1/N06/CFO/TDP_020/ECL_1_3/TC", "B1/N06/CFO/TDP_020/ECL_1_3/TS", "B1/N06/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N06/CFO/TDP_020/ECL_2_3/TC", "B1/N06/CFO/TDP_020/ECL_2_3/TS", "B1/N06/CFO/TDP_020/ECL_2_3/PH"];
	// 	this.generateDataTDP(6, autom2, `TDP_020_N0`)
  
	// 	autom2 = ["B1/N09/CFO/TDP_020/IGN", "B1/N09/CFO/TDP_020/IDEL", "B1/N09/CFO/TDP_020/Synth_SD",
	// 		"B1/N09/CFO/TDP_020/PT", "B1/N09/CFO/TDP_020/COM", "B1/N09/CFO/TDP_020/CPT/CVC",
	// 		"B1/N09/CFO/TDP_020/CPT/Ecl", "B1/N09/CFO/TDP_020/CPT/General", "B1/N09/CFO/TDP_020/CPT/PC",
	// 		"B1/N09/CFO/TDP_020/ECL_1_3/TC", "B1/N09/CFO/TDP_020/ECL_1_3/TS", "B1/N09/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N09/CFO/TDP_020/ECL_2_3/TC", "B1/N09/CFO/TDP_020/ECL_2_3/TS", "B1/N09/CFO/TDP_020/ECL_2_3/PH"];
	// 	this.generateDataTDP(9, autom2, `TDP_020_N0`)
  
	// 	autom2 = ["B1/N11/CFO/TDP_020/IGN", "B1/N11/CFO/TDP_020/IDEL", "B1/N11/CFO/TDP_020/Synth_SD",
	// 		"B1/N11/CFO/TDP_020/PT", "B1/N11/CFO/TDP_020/COM", "B1/N11/CFO/TDP_020/CPT/CVC",
	// 		"B1/N11/CFO/TDP_020/CPT/Ecl", "B1/N11/CFO/TDP_020/CPT/General", "B1/N11/CFO/TDP_020/CPT/PC",
	// 		"B1/N11/CFO/TDP_020/ECL_1_3/TC", "B1/N11/CFO/TDP_020/ECL_1_3/TS", "B1/N11/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N11/CFO/TDP_020/ECL_2_3/TC", "B1/N11/CFO/TDP_020/ECL_2_3/TS", "B1/N11/CFO/TDP_020/ECL_2_3/PH"];
	// 	this.generateDataTDP(11, autom2, `TDP_020_N`)
  
	// 	autom2 = ["B1/N13/CFO/TDP_020/IGN", "B1/N13/CFO/TDP_020/IDEL", "B1/N13/CFO/TDP_020/Synth_SD",
	// 		"B1/N13/CFO/TDP_020/PT", "B1/N13/CFO/TDP_020/COM", "B1/N13/CFO/TDP_020/CPT/CVC",
	// 		"B1/N13/CFO/TDP_020/CPT/Ecl", "B1/N13/CFO/TDP_020/CPT/General", "B1/N13/CFO/TDP_020/CPT/PC",
	// 		"B1/N13/CFO/TDP_020/ECL_1_3/TC", "B1/N13/CFO/TDP_020/ECL_1_3/TS", "B1/N13/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N13/CFO/TDP_020/ECL_2_3/TC", "B1/N13/CFO/TDP_020/ECL_2_3/TS", "B1/N13/CFO/TDP_020/ECL_2_3/PH"];
	// 	this.generateDataTDP(13, autom2, `TDP_020_N`)
  
	// 	autom2 = ["B1/N20/CFO/TDP_020/IGN", "B1/N20/CFO/TDP_020/IDEL", "B1/N20/CFO/TDP_020/Synth_SD",
	// 		"B1/N20/CFO/TDP_020/PT", "B1/N20/CFO/TDP_020/COM", "B1/N20/CFO/TDP_020/CPT/CVC",
	// 		"B1/N20/CFO/TDP_020/CPT/Ecl", "B1/N20/CFO/TDP_020/CPT/General", "B1/N20/CFO/TDP_020/CPT/PC",
	// 		"B1/N20/CFO/TDP_020/ECL_1_3/TC", "B1/N20/CFO/TDP_020/ECL_1_3/TS", "B1/N20/CFO/TDP_020/ECL_1_3/PH",
	// 		"B1/N20/CFO/TDP_020/ECL_2_3/TC", "B1/N20/CFO/TDP_020/ECL_2_3/TS", "B1/N20/CFO/TDP_020/ECL_2_3/PH"];
	// 	this.generateDataTDP(20, autom2, `TDP_020_N`)
  
	// 	/////////////////////////////:TDO_060
  
	// 	var autom3 = ["B1/N01/CFO/TDO_060/IGN", "B1/N01/CFO/TDO_060/PT", "B1/N01/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N01/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N01/CFO/TDO_060/Depart_N/Synth_OF", "B1/N01/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N01/CFO/TDO_060/Depart_R/Synth_OF", "B1/N01/CFO/TDO_060/Depart_R/Synth_SD", "B1/N01/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(1, autom3, `TDO_060_N0`)
  
	// 	autom3 = ["B1/N04/CFO/TDO_060/IGN", "B1/N04/CFO/TDO_060/PT", "B1/N04/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N04/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N04/CFO/TDO_060/Depart_N/Synth_OF", "B1/N04/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N04/CFO/TDO_060/Depart_R/Synth_OF", "B1/N04/CFO/TDO_060/Depart_R/Synth_SD", "B1/N04/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(4, autom3, `TDO_060_N0`)
  
	// 	autom3 = ["B1/N07/CFO/TDO_060/IGN", "B1/N07/CFO/TDO_060/PT", "B1/N07/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N07/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N07/CFO/TDO_060/Depart_N/Synth_OF", "B1/N07/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N07/CFO/TDO_060/Depart_R/Synth_OF", "B1/N07/CFO/TDO_060/Depart_R/Synth_SD", "B1/N07/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(7, autom3, `TDO_060_N0`)
  
	// 	autom3 = ["B1/N10/CFO/TDO_060/IGN", "B1/N10/CFO/TDO_060/PT", "B1/N10/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N10/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N10/CFO/TDO_060/Depart_N/Synth_OF", "B1/N10/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N10/CFO/TDO_060/Depart_R/Synth_OF", "B1/N10/CFO/TDO_060/Depart_R/Synth_SD", "B1/N10/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(10, autom3, `TDO_060_N`)
  
	// 	autom3 = ["B1/N13/CFO/TDO_060/IGN", "B1/N13/CFO/TDO_060/PT", "B1/N13/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N13/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N13/CFO/TDO_060/Depart_N/Synth_OF", "B1/N13/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N13/CFO/TDO_060/Depart_R/Synth_OF", "B1/N13/CFO/TDO_060/Depart_R/Synth_SD", "B1/N13/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(13, autom3, `TDO_060_N`)
  
	// 	autom3 = ["B1/N16/CFO/TDO_060/IGN", "B1/N16/CFO/TDO_060/PT", "B1/N16/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N16/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N16/CFO/TDO_060/Depart_N/Synth_OF", "B1/N16/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N16/CFO/TDO_060/Depart_R/Synth_OF", "B1/N16/CFO/TDO_060/Depart_R/Synth_SD", "B1/N16/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(16, autom3, `TDO_060_N`)
  
	// 	autom3 = ["B1/N19/CFO/TDO_060/IGN", "B1/N19/CFO/TDO_060/PT", "B1/N19/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N19/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N19/CFO/TDO_060/Depart_N/Synth_OF", "B1/N19/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N19/CFO/TDO_060/Depart_R/Synth_OF", "B1/N19/CFO/TDO_060/Depart_R/Synth_SD", "B1/N19/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(19, autom3, `TDO_060_N`)
  
	// 	autom3 = ["B1/N22/CFO/TDO_060/IGN", "B1/N22/CFO/TDO_060/PT", "B1/N22/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/N22/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/N22/CFO/TDO_060/Depart_N/Synth_OF", "B1/N22/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/N22/CFO/TDO_060/Depart_R/Synth_OF", "B1/N22/CFO/TDO_060/Depart_R/Synth_SD", "B1/N22/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(22, autom3, `TDO_060_N`)
  
	// 	autom3 = ["B1/S02/CFO/TDO_060/IGN", "B1/S02/CFO/TDO_060/PT", "B1/S02/CFO/TDO_060/Depart_Aux/Synth_OF",
	// 		"B1/S02/CFO/TDO_060/Depart_Aux/Synth_SD", "B1/S02/CFO/TDO_060/Depart_N/Synth_OF", "B1/S02/CFO/TDO_060/Depart_N/Synth_SD",
	// 		"B1/S02/CFO/TDO_060/Depart_R/Synth_OF", "B1/S02/CFO/TDO_060/Depart_R/Synth_SD", "B1/S02/CFO/TDO_060/COM"];
	// 	this.generateDataTDO(2, autom3, `TDO_030_S0`)
  
  
	// 	//////////////////////////////:TDH_020
  
	// 	var autom4 = ["B1/N23/CFO/TDH_020/COM", "B1/N23/CFO/TDH_020/PT", "B1/N23/CFO/TDH_020/IGN",
	// 		"B1/N23/CFO/TDH_020/PARA", "B1/N23/CFO/TDH_020/Synth_SD"];
	// 	this.generateDataTDH(23, autom4, `TDH_020_N`)
  
	// 	autom4 = ["B1/S01/CFO/TDH_020/COM", "B1/S01/CFO/TDH_020/PT", "B1/S01/CFO/TDH_020/IGN",
	// 		"B1/S01/CFO/TDH_020/PARA", "B1/S01/CFO/TDH_020/Synth_SD"];
	// 	this.generateDataTDH(1, autom4, `TDH_020_S0`)
  
	// 	//////////////////////////////:TDG_030
  
	// 	var autom5 = ["B1/N04/CFO/TDG_030/IGN", "B1/N04/CFO/TDG_030/Synth_SD", "B1/N04/CFO/TDG_030/PT",
	// 		"B1/N04/CFO/TDG_030/COM", "B1/N04/CFO/TDG_030/CPT/BECS",
	// 		"B1/N04/CFO/TDG_030/CPT/Ecl", "B1/N04/CFO/TDG_030/CPT/PC", "B1/N04/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N04/CFO/TDG_030/ECL_Gorges/TS", "B1/N04/CFO/TDG_030/ECL_Gorges/TC", "B1/N04/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N04/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N04/CFO/TDG_030/ECL_Spots/TS", "B1/N04/CFO/TDG_030/ECL_Spots/TC",
	// 		"B1/N04/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N04/CFO/TDG_030/ECL_Spots/Commut_M"];
	// 	this.generateDataTDG(4, autom5, `TDG_030_N0`)
  
	// 	autom5 = ["B1/N10/CFO/TDG_030/IGN", "B1/N10/CFO/TDG_030/Synth_SD", "B1/N10/CFO/TDG_030/PT",
	// 		"B1/N10/CFO/TDG_030/COM", "B1/N10/CFO/TDG_030/CPT/BECS",
	// 		"B1/N10/CFO/TDG_030/CPT/Ecl", "B1/N10/CFO/TDG_030/CPT/PC", "B1/N10/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N10/CFO/TDG_030/ECL_Gorges/TS", "B1/N10/CFO/TDG_030/ECL_Gorges/TC", "B1/N10/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N10/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N10/CFO/TDG_030/ECL_Spots/TS", "B1/N10/CFO/TDG_030/ECL_Spots/TC",
	// 		"B1/N10/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N10/CFO/TDG_030/ECL_Spots/Commut_M"];
	// 	this.generateDataTDG(10, autom5, `TDG_030_N`)
  
	// 	autom5 = ["B1/N13/CFO/TDG_030/IGN", "B1/N13/CFO/TDG_030/Synth_SD", "B1/N13/CFO/TDG_030/PT",
	// 		"B1/N13/CFO/TDG_030/COM", "B1/N13/CFO/TDG_030/CPT/BECS",
	// 		"B1/N13/CFO/TDG_030/CPT/Ecl", "B1/N13/CFO/TDG_030/CPT/PC", "B1/N13/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N13/CFO/TDG_030/ECL_Gorges/TS", "B1/N13/CFO/TDG_030/ECL_Gorges/TC", "B1/N13/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N13/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N13/CFO/TDG_030/ECL_Spots/TS", "B1/N13/CFO/TDG_030/ECL_Spots/TC",
	// 		"B1/N13/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N13/CFO/TDG_030/ECL_Spots/Commut_M"];
	// 	this.generateDataTDG(13, autom5, `TDG_030_N`)
  
	// 	autom5 = ["B1/N16/CFO/TDG_030/IGN", "B1/N16/CFO/TDG_030/Synth_SD", "B1/N16/CFO/TDG_030/PT",
	// 		"B1/N16/CFO/TDG_030/COM", "B1/N16/CFO/TDG_030/CPT/BECS",
	// 		"B1/N16/CFO/TDG_030/CPT/Ecl", "B1/N16/CFO/TDG_030/CPT/PC", "B1/N16/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N16/CFO/TDG_030/ECL_Gorges/TS", "B1/N16/CFO/TDG_030/ECL_Gorges/TC", "B1/N16/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N16/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N16/CFO/TDG_030/ECL_Spots/TS", "B1/N16/CFO/TDG_030/ECL_Spots/TC",
	// 		"B1/N16/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N16/CFO/TDG_030/ECL_Spots/Commut_M"];
	// 	this.generateDataTDG(16, autom5, `TDG_030_N`)
  
	// 	autom5 = ["B1/N19/CFO/TDG_030/IGN", "B1/N19/CFO/TDG_030/Synth_SD", "B1/N19/CFO/TDG_030/PT",
	// 		"B1/N19/CFO/TDG_030/COM", "B1/N19/CFO/TDG_030/CPT/BECS",
	// 		"B1/N19/CFO/TDG_030/CPT/Ecl", "B1/N19/CFO/TDG_030/CPT/PC", "B1/N19/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N19/CFO/TDG_030/ECL_Gorges/TS", "B1/N19/CFO/TDG_030/ECL_Gorges/TC", "B1/N19/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N19/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N19/CFO/TDG_030/ECL_Spots/TS", "B1/N19/CFO/TDG_030/ECL_Spots/TC",
	// 		"B1/N19/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N19/CFO/TDG_030/ECL_Spots/Commut_M"];
	// 	this.generateDataTDG(19, autom5, `TDG_030_N`)
  
	// 	autom5 = ["B1/N22/CFO/TDG_030/IGN", "B1/N22/CFO/TDG_030/Synth_SD", "B1/N22/CFO/TDG_030/PT",
	// 		"B1/N22/CFO/TDG_030/COM", "B1/N22/CFO/TDG_030/CPT/BECS",
	// 		"B1/N22/CFO/TDG_030/CPT/Ecl", "B1/N22/CFO/TDG_030/CPT/PC", "B1/N22/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N22/CFO/TDG_030/ECL_Gorges/TS", "B1/N22/CFO/TDG_030/ECL_Gorges/TC", "B1/N22/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N22/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N22/CFO/TDG_030/ECL_Spots/TS", "B1/N22/CFO/TDG_030/ECL_Spots/TC",
	// 		"B1/N22/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N22/CFO/TDG_030/ECL_Spots/Commut_M"];
	// 	this.generateDataTDG(22, autom5, `TDG_030_N`)
  
	// 	//////////////////////////////:OHQ
  
	// 	var autom6 = ["B1/N23/CFO/OHQ_001/IN_L1/V", "B1/N23/CFO/OHQ_001/IN_L1/I", "B1/N23/CFO/OHQ_001/IN_L1/P",
	// 		"B1/N23/CFO/OHQ_001/IN_L2/V", "B1/N23/CFO/OHQ_001/IN_L2/I", "B1/N23/CFO/OHQ_001/IN_L2/P",
	// 		"B1/N23/CFO/OHQ_001/IN_L3/V", "B1/N23/CFO/OHQ_001/IN_L3/I", "B1/N23/CFO/OHQ_001/IN_L3/P",
	// 		"B1/N23/CFO/OHQ_001/Out_L1/V", "B1/N23/CFO/OHQ_001/Out_L1/I", "B1/N23/CFO/OHQ_001/Out_L1/P",
	// 		"B1/N23/CFO/OHQ_001/Out_L2/V", "B1/N23/CFO/OHQ_001/Out_L2/I", "B1/N23/CFO/OHQ_001/Out_L2/P",
	// 		"B1/N23/CFO/OHQ_001/Out_L3/V", "B1/N23/CFO/OHQ_001/Out_L3/I", "B1/N23/CFO/OHQ_001/Out_L3/P",
	// 		"B1/N23/CFO/OHQ_001/Batterie/I", "B1/N23/CFO/OHQ_001/Batterie/Load", "B1/N23/CFO/OHQ_001/Batterie/Low",
	// 		"B1/N23/CFO/OHQ_001/Batterie/OK", "B1/N23/CFO/OHQ_001/Batterie/Temp", "B1/N23/CFO/OHQ_001/Batterie/V",
	// 		"B1/N23/CFO/OHQ_001/TA", "B1/N23/CFO/OHQ_001/OnByPass", "B1/N23/CFO/OHQ_001/OnRectifier",
	// 		"B1/N23/CFO/OHQ_001/MainsByPass", "B1/N23/CFO/OHQ_001/MainsRectifier", "B1/N23/CFO/OHQ_001/OverLoad",
	// 		"B1/N23/CFO/OHQ_001/OutputBad", "B1/N23/CFO/OHQ_001/OnInverter", "B1/N23/CFO/OHQ_001/OnManual",
	// 		"B1/N23/CFO/OHQ_001/LoadOff", "B1/N23/CFO/OHQ_001/Check"];
	// 	this.generateDataOHQ(23, autom6, `OHQ_001_N`)
  
	// 	autom6 = ["B1/N23/CFO/OHQ_002/IN_L1/V", "B1/N23/CFO/OHQ_002/IN_L1/I", "B1/N23/CFO/OHQ_002/IN_L1/P",
	// 		"B1/N23/CFO/OHQ_002/IN_L2/V", "B1/N23/CFO/OHQ_002/IN_L2/I", "B1/N23/CFO/OHQ_002/IN_L2/P",
	// 		"B1/N23/CFO/OHQ_002/IN_L3/V", "B1/N23/CFO/OHQ_002/IN_L3/I", "B1/N23/CFO/OHQ_002/IN_L3/P",
	// 		"B1/N23/CFO/OHQ_002/Out_L1/V", "B1/N23/CFO/OHQ_002/Out_L1/I", "B1/N23/CFO/OHQ_002/Out_L1/P",
	// 		"B1/N23/CFO/OHQ_002/Out_L2/V", "B1/N23/CFO/OHQ_002/Out_L2/I", "B1/N23/CFO/OHQ_002/Out_L2/P",
	// 		"B1/N23/CFO/OHQ_002/Out_L3/V", "B1/N23/CFO/OHQ_002/Out_L3/I", "B1/N23/CFO/OHQ_002/Out_L3/P",
	// 		"B1/N23/CFO/OHQ_002/Batterie/I", "B1/N23/CFO/OHQ_002/Batterie/Load", "B1/N23/CFO/OHQ_002/Batterie/Low",
	// 		"B1/N23/CFO/OHQ_002/Batterie/OK", "B1/N23/CFO/OHQ_002/Batterie/Temp", "B1/N23/CFO/OHQ_002/Batterie/V",
	// 		"B1/N23/CFO/OHQ_002/TA", "B1/N23/CFO/OHQ_002/OnByPass", "B1/N23/CFO/OHQ_002/OnRectifier",
	// 		"B1/N23/CFO/OHQ_002/MainsByPass", "B1/N23/CFO/OHQ_002/MainsRectifier", "B1/N23/CFO/OHQ_002/OverLoad",
	// 		"B1/N23/CFO/OHQ_002/OutputBad", "B1/N23/CFO/OHQ_002/OnInverter", "B1/N23/CFO/OHQ_002/OnManual",
	// 		"B1/N23/CFO/OHQ_002/LoadOff", "B1/N23/CFO/OHQ_002/Check"];
	// 	this.generateDataOHQ(23, autom6, `OHQ_002_N`)
  
	// 	autom6 = ["B1/S01/CFO/OHQ_001/IN_L1/V", "B1/S01/CFO/OHQ_001/IN_L1/I", "B1/S01/CFO/OHQ_001/IN_L1/P",
	// 		"B1/S01/CFO/OHQ_001/IN_L2/V", "B1/S01/CFO/OHQ_001/IN_L2/I", "B1/S01/CFO/OHQ_001/IN_L2/P",
	// 		"B1/S01/CFO/OHQ_001/IN_L3/V", "B1/S01/CFO/OHQ_001/IN_L3/I", "B1/S01/CFO/OHQ_001/IN_L3/P",
	// 		"B1/S01/CFO/OHQ_001/Out_L1/V", "B1/S01/CFO/OHQ_001/Out_L1/I", "B1/S01/CFO/OHQ_001/Out_L1/P",
	// 		"B1/S01/CFO/OHQ_001/Out_L2/V", "B1/S01/CFO/OHQ_001/Out_L2/I", "B1/S01/CFO/OHQ_001/Out_L2/P",
	// 		"B1/S01/CFO/OHQ_001/Out_L3/V", "B1/S01/CFO/OHQ_001/Out_L3/I", "B1/S01/CFO/OHQ_001/Out_L3/P",
	// 		"B1/S01/CFO/OHQ_001/Batterie/I", "B1/S01/CFO/OHQ_001/Batterie/Load", "B1/S01/CFO/OHQ_001/Batterie/Low",
	// 		"B1/S01/CFO/OHQ_001/Batterie/OK", "B1/S01/CFO/OHQ_001/Batterie/Temp", "B1/S01/CFO/OHQ_001/Batterie/V",
	// 		"B1/S01/CFO/OHQ_001/TA", "B1/S01/CFO/OHQ_001/OnByPass", "B1/S01/CFO/OHQ_001/OnRectifier",
	// 		"B1/S01/CFO/OHQ_001/MainsByPass", "B1/S01/CFO/OHQ_001/MainsRectifier", "B1/S01/CFO/OHQ_001/OverLoad",
	// 		"B1/S01/CFO/OHQ_001/OutputBad", "B1/S01/CFO/OHQ_001/OnInverter", "B1/S01/CFO/OHQ_001/OnManual",
	// 		"B1/S01/CFO/OHQ_001/LoadOff", "B1/S01/CFO/OHQ_001/Check"];
	// 	this.generateDataOHQ(1, autom6, `OHQ_001_S0`)
  
	// 	autom6 = ["B1/S01/CFO/OHQ_002/IN_L1/V", "B1/S01/CFO/OHQ_002/IN_L1/I", "B1/S01/CFO/OHQ_002/IN_L1/P",
	// 		"B1/S01/CFO/OHQ_002/IN_L2/V", "B1/S01/CFO/OHQ_002/IN_L2/I", "B1/S01/CFO/OHQ_002/IN_L2/P",
	// 		"B1/S01/CFO/OHQ_002/IN_L3/V", "B1/S01/CFO/OHQ_002/IN_L3/I", "B1/S01/CFO/OHQ_002/IN_L3/P",
	// 		"B1/S01/CFO/OHQ_002/Out_L1/V", "B1/S01/CFO/OHQ_002/Out_L1/I", "B1/S01/CFO/OHQ_002/Out_L1/P",
	// 		"B1/S01/CFO/OHQ_002/Out_L2/V", "B1/S01/CFO/OHQ_002/Out_L2/I", "B1/S01/CFO/OHQ_002/Out_L2/P",
	// 		"B1/S01/CFO/OHQ_002/Out_L3/V", "B1/S01/CFO/OHQ_002/Out_L3/I", "B1/S01/CFO/OHQ_002/Out_L3/P",
	// 		"B1/S01/CFO/OHQ_002/Batterie/I", "B1/S01/CFO/OHQ_002/Batterie/Load", "B1/S01/CFO/OHQ_002/Batterie/Low",
	// 		"B1/S01/CFO/OHQ_002/Batterie/OK", "B1/S01/CFO/OHQ_002/Batterie/Temp", "B1/S01/CFO/OHQ_002/Batterie/V",
	// 		"B1/S01/CFO/OHQ_002/TA", "B1/S01/CFO/OHQ_002/OnByPass", "B1/S01/CFO/OHQ_002/OnRectifier",
	// 		"B1/S01/CFO/OHQ_002/MainsByPass", "B1/S01/CFO/OHQ_002/MainsRectifier", "B1/S01/CFO/OHQ_002/OverLoad",
	// 		"B1/S01/CFO/OHQ_002/OutputBad", "B1/S01/CFO/OHQ_002/OnInverter", "B1/S01/CFO/OHQ_002/OnManual",
	// 		"B1/S01/CFO/OHQ_002/LoadOff", "B1/S01/CFO/OHQ_002/Check"];
	// 	this.generateDataOHQ(1, autom6, `OHQ_002_S0`)
  
	// 	autom6 = ["B1/N00/CFO/OHQ_001/IN_L1/V", "B1/N00/CFO/OHQ_001/IN_L1/I", "B1/N00/CFO/OHQ_001/IN_L1/P",
	// 		"B1/N00/CFO/OHQ_001/IN_L2/V", "B1/N00/CFO/OHQ_001/IN_L2/I", "B1/N00/CFO/OHQ_001/IN_L2/P",
	// 		"B1/N00/CFO/OHQ_001/IN_L3/V", "B1/N00/CFO/OHQ_001/IN_L3/I", "B1/N00/CFO/OHQ_001/IN_L3/P",
	// 		"B1/N00/CFO/OHQ_001/Out_L1/V", "B1/N00/CFO/OHQ_001/Out_L1/I", "B1/N00/CFO/OHQ_001/Out_L1/P",
	// 		"B1/N00/CFO/OHQ_001/Out_L2/V", "B1/N00/CFO/OHQ_001/Out_L2/I", "B1/N00/CFO/OHQ_001/Out_L2/P",
	// 		"B1/N00/CFO/OHQ_001/Out_L3/V", "B1/N00/CFO/OHQ_001/Out_L3/I", "B1/N00/CFO/OHQ_001/Out_L3/P",
	// 		"B1/N00/CFO/OHQ_001/Batterie/I", "B1/N00/CFO/OHQ_001/Batterie/Load", "B1/N00/CFO/OHQ_001/Batterie/Low",
	// 		"B1/N00/CFO/OHQ_001/Batterie/OK", "B1/N00/CFO/OHQ_001/Batterie/Temp", "B1/N00/CFO/OHQ_001/Batterie/V",
	// 		"B1/N00/CFO/OHQ_001/TA", "B1/N00/CFO/OHQ_001/OnByPass", "B1/N00/CFO/OHQ_001/OnRectifier",
	// 		"B1/N00/CFO/OHQ_001/MainsByPass", "B1/N00/CFO/OHQ_001/MainsRectifier", "B1/N00/CFO/OHQ_001/OverLoad",
	// 		"B1/N00/CFO/OHQ_001/OutputBad", "B1/N00/CFO/OHQ_001/OnInverter", "B1/N00/CFO/OHQ_001/OnManual",
	// 		"B1/N00/CFO/OHQ_001/LoadOff", "B1/N00/CFO/OHQ_001/Check"];
	// 	this.generateDataOHQ(0, autom6, `OHQ_001_N0`)
  
	// 	//////////////////////////////:TDN_020
  
	// 	var autom7 = ["B1/N00/CFO/TDN_020/IGN", "B1/N00/CFO/TDN_020/Synth_OF", "B1/N00/CFO/TDN_020/Synth_SD",
	// 		"B1/N00/CFO/TDN_020/COM", "B1/N00/CFO/TDN_020/CPT/CVC", "B1/N00/CFO/TDN_020/CPT/DIVERS",
	// 		"B1/N00/CFO/TDN_020/CPT/Ecl", "B1/N00/CFO/TDN_020/CPT/PC"];
	// 	this.generateDataTDN(0, autom7, `TDN_020_N0`)
  
	// 	//////////////////////////////:TDG_010
  
	// 	var autom8 = ["B1/N00/CFO/TDG_010/IGN", "B1/N00/CFO/TDG_010/Synth_SD", "B1/N00/CFO/TDG_010/PT",
	// 		"B1/N00/CFO/TDG_010/CPT/BECS",
	// 		"B1/N00/CFO/TDG_010/CPT/Ecl", "B1/N00/CFO/TDG_010/CPT/PC", "B1/N00/CFO/TDG_010/CPT/CVC",
	// 		"B1/N00/CFO/TDG_010/ECL_Gorges/TS", "B1/N00/CFO/TDG_010/ECL_Gorges/TC", "B1/N00/CFO/TDG_010/ECL_Gorges/Commut_A",
	// 		"B1/N00/CFO/TDG_010/ECL_Gorges/Commut_M", "B1/N00/CFO/TDG_010/ECL_Circulation/TS", "B1/N00/CFO/TDG_010/ECL_Circulation/TC",
	// 		"B1/N00/CFO/TDG_010/ECL_Circulation/Commut_A", "B1/N00/CFO/TDG_010/ECL_Circulation/Commut_M"];
	// 	this.generateDataTDGG(0, autom8, `TDG_010_N0`)
  
	// 	//////////////////////////////:TDG_030_N01
  
	// 	var autom8 = ["B1/N01/CFO/TDG_030/IGN", "B1/N01/CFO/TDG_030/Synth_SD", "B1/N01/CFO/TDG_030/PT", "B1/N01/CFO/TDG_030/COM",
	// 		"B1/N01/CFO/TDG_030/CPT/BECS", "B1/N01/CFO/TDG_030/CPT/Ecl", "B1/N01/CFO/TDG_030/CPT/PC", "B1/N01/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N01/CFO/TDG_030/ECL_Gorges/TS", "B1/N01/CFO/TDG_030/ECL_Gorges/TC", "B1/N01/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N01/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N01/CFO/TDG_030/ECL_Gorges/PH", "B1/N01/CFO/TDG_030/ECL_Spots/TS",
	// 		"B1/N01/CFO/TDG_030/ECL_Spots/TC", "B1/N01/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N01/CFO/TDG_030/ECL_Spots/Commut_M", "B1/N01/CFO/TDG_030/ECL_Spots/PH",
	// 		"B1/N01/CFO/TDG_030/ECL_Mezza/TS", "B1/N01/CFO/TDG_030/ECL_Mezza/TC", "B1/N01/CFO/TDG_030/ECL_Mezza/Commut_A", "B1/N01/CFO/TDG_030/ECL_Mezza/Commut_M", "B1/N01/CFO/TDG_030/ECL_Mezza/PH",
	// 		"B1/N01/CFO/TDG_030/ECL_Vinci/TS", "B1/N01/CFO/TDG_030/ECL_Vinci/TC", "B1/N01/CFO/TDG_030/ECL_Vinci/Commut_A",
	// 		"B1/N01/CFO/TDG_030/ECL_Vinci/Commut_M", "B1/N01/CFO/TDG_030/ECL_Vinci/PH",
	// 		"B1/N01/CFO/TDG_030/ECL_1_3/TS", "B1/N01/CFO/TDG_030/ECL_1_3/TC",
	// 		"B1/N01/CFO/TDG_030/ECL_1_3/Commut", "B1/N01/CFO/TDG_030/ECL_1_3/PH",
	// 		"B1/N01/CFO/TDG_030/ECL_2_3/TS", "B1/N01/CFO/TDG_030/ECL_2_3/TC",
	// 		"B1/N01/CFO/TDG_030/ECL_2_3/Commut", "B1/N01/CFO/TDG_030/ECL_2_3/PH"];
	// 	this.generateDataTDG_N01(1, autom8, `TDG_030_N0`)
  
	// 	//////////////////////////////:TDG_030_N07
  
	// 	var autom9 = ["B1/N07/CFO/TDG_030/IGN", "B1/N07/CFO/TDG_030/Synth_SD", "B1/N07/CFO/TDG_030/PT", "B1/N07/CFO/TDG_030/COM",
	// 		"B1/N07/CFO/TDG_030/CPT/BECS", "B1/N07/CFO/TDG_030/CPT/Ecl", "B1/N07/CFO/TDG_030/CPT/PC", "B1/N07/CFO/TDG_030/CPT/DIVERS",
	// 		"B1/N07/CFO/TDG_030/ECL_Gorges/TS", "B1/N07/CFO/TDG_030/ECL_Gorges/TC", "B1/N07/CFO/TDG_030/ECL_Gorges/Commut_A",
	// 		"B1/N07/CFO/TDG_030/ECL_Gorges/Commut_M", "B1/N07/CFO/TDG_030/ECL_Gorges/PH", "B1/N07/CFO/TDG_030/ECL_Spots/TS",
	// 		"B1/N07/CFO/TDG_030/ECL_Spots/TC", "B1/N07/CFO/TDG_030/ECL_Spots/Commut_A", "B1/N07/CFO/TDG_030/ECL_Spots/Commut_M",
	// 		"B1/N07/CFO/TDG_030/ECL_Spots/PH", "B1/N07/CFO/TDG_030/ECL_1_3/TS", "B1/N07/CFO/TDG_030/ECL_1_3/TC",
	// 		"B1/N07/CFO/TDG_030/ECL_1_3/Commut", "B1/N07/CFO/TDG_030/ECL_1_3/PH", "B1/N07/CFO/TDG_030/ECL_2_3/TS",
	// 		"B1/N07/CFO/TDG_030/ECL_2_3/TC", "B1/N07/CFO/TDG_030/ECL_2_3/Commut", "B1/N07/CFO/TDG_030/ECL_2_3/PH"];
	// 	this.generateDataTDG_N07(7, autom9, `TDG_030_N0`)
  
	// 	//////////////////////////////:TDH_050_N00
  
	// 	var autom10 = ["B1/N00/CFO/TDH_050/COM", "B1/N00/CFO/TDH_050/PT", "B1/N00/CFO/TDH_050/IGN", "B1/N00/CFO/TDH_050/PARA",
	// 		"B1/N00/CFO/TDH_050/Synth_SD", "B1/N00/CFO/TDH_050/IBYP", "B1/N00/CFO/TDH_050/CPT/CVC", "B1/N00/CFO/TDH_050/CPT/General"];
	// 	this.generateDataTDH_N00(0, autom10, `TDH_050_N0`)
  
	// 	//////////////////////////////:TDS_040_N00
  
	// 	var autom11 = ["B1/N00/CFO/TDS_040/IG_S1", "B1/N00/CFO/TDS_040/IG_S2", "B1/N00/CFO/TDS_040/Inv", "B1/N00/CFO/TDS_040/PT_S1",
	// 		"B1/N00/CFO/TDS_040/PT_S2", "B1/N00/CFO/TDS_040/Synth_OF", "B1/N00/CFO/TDS_040/Synth_SD", "B1/N00/CFO/TDS_040/CPT/CVC"];
	// 	this.generateDataTDS_N00(0, autom11, `TDS_040_N0`)
  
	// 	//////////////////////////////:TDP_010_S01
  
	// 	var autom12 = ["B1/N01/CFO/TDP_010/IGN", "B1/N01/CFO/TDP_010/IDEL", "B1/N01/CFO/TDP_010/Synth_SD",
	// 		"B1/N01/CFO/TDP_010/PT", "B1/N01/CFO/TDP_010/COM", "B1/N01/CFO/TDP_010/CPT/CVC",
	// 		"B1/N01/CFO/TDP_010/CPT/Ecl", "B1/N01/CFO/TDP_010/CPT/General", "B1/N01/CFO/TDP_010/CPT/PC",
	// 		"B1/N01/CFO/TDP_010/ECL_2_3/TC", "B1/N01/CFO/TDP_010/ECL_2_3/TS", "B1/N01/CFO/TDP_010/ECL_2_3/PH"];
	// 	this.generateDataTDP_N01(1, autom12, `TDP_010_N0`)
  
	// 	//////////////////////////////:TGB_100
  
	// 	var autom13 = ["B1/S01/CFO/TGB_100/Coffret_Aux/Synth_OF", "B1/S01/CFO/TGB_100/Coffret_Aux/Synth_SD", "B1/S01/CFO/TGB_100/CPT/CME_101/I1",
	// 		"B1/S01/CFO/TGB_100/CPT/CME_101/I2", "B1/S01/CFO/TGB_100/CPT/CME_101/I3", "B1/S01/CFO/TGB_100/CPT/CME_101/Nrj", "B1/S01/CFO/TGB_100/CPT/CME_101/P",
	// 		"B1/S01/CFO/TGB_100/CPT/CME_101/U12", "B1/S01/CFO/TGB_100/CPT/CME_101/U23", "B1/S01/CFO/TGB_100/CPT/CME_101/U31",
	// 		"B1/S01/CFO/TGB_100/Q01/OF", "B1/S01/CFO/TGB_100/Q01/SD", "B1/S01/CFO/TGB_100/Q02/OF", "B1/S01/CFO/TGB_100/Q02/SD",
	// 		"B1/S01/CFO/TGB_100/Q03/OF", "B1/S01/CFO/TGB_100/Q03/SD", "B1/S01/CFO/TGB_100/Q04/OF", "B1/S01/CFO/TGB_100/Q04/SD",
	// 		"B1/S01/CFO/TGB_100/Q05/OF", "B1/S01/CFO/TGB_100/Q05/SD", "B1/S01/CFO/TGB_100/Q06/OF", "B1/S01/CFO/TGB_100/Q06/SD",
	// 		"B1/S01/CFO/TGB_100/Q07/OF", "B1/S01/CFO/TGB_100/Q07/SD", "B1/S01/CFO/TGB_100/Q08/OF", "B1/S01/CFO/TGB_100/Q08/SD",
	// 		"B1/S01/CFO/TGB_100/Q09/OF", "B1/S01/CFO/TGB_100/Q09/SD", "B1/S01/CFO/TGB_100/Q10/OF", "B1/S01/CFO/TGB_100/Q10/SD",
	// 		"B1/S01/CFO/TGB_100/Q11/OF", "B1/S01/CFO/TGB_100/Q11/SD", "B1/S01/CFO/TGB_100/Q12/OF", "B1/S01/CFO/TGB_100/Q12/SD",
	// 		"B1/S01/CFO/TGB_100/Q13/OF", "B1/S01/CFO/TGB_100/Q13/SD", "B1/S01/CFO/TGB_100/Q14/OF", "B1/S01/CFO/TGB_100/Q14/SD",
	// 		"B1/S01/CFO/TGB_100/Q15/OF", "B1/S01/CFO/TGB_100/Q15/SD", "B1/S01/CFO/TGB_100/Q16/OF", "B1/S01/CFO/TGB_100/Q16/SD",
	// 		"B1/S01/CFO/TGB_100/Q17/OF", "B1/S01/CFO/TGB_100/Q17/SD", "B1/S01/CFO/TGB_100/Q18/OF", "B1/S01/CFO/TGB_100/Q18/SD",
	// 		"B1/S01/CFO/TGB_100/Q19/OF", "B1/S01/CFO/TGB_100/Q19/SD", "B1/S01/CFO/TGB_100/Q20/OF", "B1/S01/CFO/TGB_100/Q20/SD",
	// 		"B1/S01/CFO/TGB_100/Q21/OF", "B1/S01/CFO/TGB_100/Q21/SD", "B1/S01/CFO/TGB_100/Q22/OF", "B1/S01/CFO/TGB_100/Q22/SD",
	// 		"B1/S01/CFO/TGB_100/Q23/OF", "B1/S01/CFO/TGB_100/Q23/SD", "B1/S01/CFO/TGB_100/Q24/OF", "B1/S01/CFO/TGB_100/Q24/SD",
	// 		"B1/S01/CFO/TGB_100/Q25/OF", "B1/S01/CFO/TGB_100/Q25/SD", "B1/S01/CFO/TGB_100/Q26/OF", "B1/S01/CFO/TGB_100/Q26/SD",
	// 		"B1/S01/CFO/TGB_100/Q27/OF", "B1/S01/CFO/TGB_100/Q27/SD", "B1/S01/CFO/TGB_100/Q28/OF", "B1/S01/CFO/TGB_100/Q28/SD",
	// 		"B1/S01/CFO/TGB_100/Q29/OF", "B1/S01/CFO/TGB_100/Q29/SD", "B1/S01/CFO/TGB_100/Q30/OF", "B1/S01/CFO/TGB_100/Q30/SD",
	// 		"B1/S01/CFO/TGB_100/Q31/OF", "B1/S01/CFO/TGB_100/Q31/SD", "B1/S01/CFO/TGB_100/Q32/OF", "B1/S01/CFO/TGB_100/Q32/SD",
	// 		"B1/S01/CFO/TGB_100/Q33/OF", "B1/S01/CFO/TGB_100/Q33/SD", "B1/S01/CFO/TGB_100/Q34/OF", "B1/S01/CFO/TGB_100/Q34/SD",
	// 		"B1/S01/CFO/TGB_100/Q35/OF", "B1/S01/CFO/TGB_100/Q35/SD", "B1/S01/CFO/TGB_100/Q36/OF", "B1/S01/CFO/TGB_100/Q36/SD",
	// 		"B1/S01/CFO/TGB_100/Q37/OF", "B1/S01/CFO/TGB_100/Q37/SD", "B1/S01/CFO/TGB_100/Q38/OF", "B1/S01/CFO/TGB_100/Q38/SD",
	// 		"B1/S01/CFO/TGB_100/Q39/OF", "B1/S01/CFO/TGB_100/Q39/SD", "B1/S01/CFO/TGB_100/Q40/OF", "B1/S01/CFO/TGB_100/Q40/SD",
	// 		"B1/S01/CFO/TGB_100/Q41/OF", "B1/S01/CFO/TGB_100/Q41/SD",
	// 		"B1/S01/CFO/TGB_100/QiG/OF", "B1/S01/CFO/TGB_100/QiG/Pos_Deb", "B1/S01/CFO/TGB_100/QiG/Pos_Emb", "B1/S01/CFO/TGB_100/QiG/Pos_test",
	// 		"B1/S01/CFO/TGB_100/QiG/SD", "B1/S01/CFO/TGB_100/PT"];
	// 	this.generateDataTGB_100(1, autom13, `TGB_100_S0`)
	// }
  
  
	// /**
	// * @private
	// * @returns {generateDataTDG}
	// * @memberof InputData
	// */
	// private generateDataTDG(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Perte Communication Equippement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-BECS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_BECS`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_Ecl`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_PC`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-DIVERS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_DIVERS`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TS`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TC`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_A`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_M`,
	// 		urls[11]
	// 	);
  
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Spots CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_TS`,
	// 		urls[12]
	// 	);
  
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Spots CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_TC`,
	// 		urls[13]
	// 	);
  
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_Commut_A`,
	// 		urls[14]
	// 	);
  
	// 	const CHILD_16: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_Commut_M`,
	// 		urls[15]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12, CHILD_13, CHILD_14, CHILD_15, CHILD_16);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
	// /**
	// 	 * @private
	// 	 * @returns {generateDataTDG_N07}
	// 	 * @memberof InputData
	// 	 */
	// private generateDataTDG_N07(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Perte Communication Equippement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-BECS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_BECS`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_Ecl`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_PC`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-DIVERS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_DIVERS`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Spots CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_TS`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Spots CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_TC`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_Commut_A`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_Commut_M`,
	// 		urls[11]
	// 	);
  
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL spots`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_PH`,
	// 		urls[12]
	// 	);
  
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Gorges`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TS`,
	// 		urls[13]
	// 	);
  
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB Gorges`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TC`,
	// 		urls[14]
	// 	);
  
	// 	const CHILD_16: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_A`,
	// 		urls[15]
	// 	);
  
	// 	const CHILD_17: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_M`,
	// 		urls[16]
	// 	);
  
	// 	const CHILD_18: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL Gorges`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_PH`,
	// 		urls[17]
	// 	);
  
	// 	const CHILD_19: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TS`,
	// 		urls[18]
	// 	);
  
	// 	const CHILD_20: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TC`,
	// 		urls[19]
	// 	);
  
	// 	const CHILD_21: InputDataEndpoint = new InputDataEndpoint(
	// 		`1-Auto / 2 Marche Forcee/ 3-Arret`,
	// 		0,
	// 		"",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_Commut`,
	// 		urls[20]
	// 	);
  
	// 	const CHILD_22: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_PH`,
	// 		urls[21]
	// 	);
  
	// 	const CHILD_23: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 2/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TS`,
	// 		urls[22]
	// 	);
  
	// 	const CHILD_24: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB 2/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TC`,
	// 		urls[23]
	// 	);
  
	// 	const CHILD_25: InputDataEndpoint = new InputDataEndpoint(
	// 		`1-Auto / 2 Marche Forcee/ 3-Arret`,
	// 		0,
	// 		"",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_Commut`,
	// 		urls[24]
	// 	);
  
	// 	const CHILD_26: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 2/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_PH`,
	// 		urls[25]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12,
	// 		CHILD_13, CHILD_14, CHILD_15, CHILD_16, CHILD_17, CHILD_18, CHILD_19, CHILD_20, CHILD_21, CHILD_22, CHILD_23, CHILD_24, CHILD_25,
	// 		CHILD_26);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
	// /**
	// * @private
	// * @returns {generateDataTDG_N01}
	// * @memberof InputData
	// */
	// private generateDataTDG_N01(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Perte Communication Equippement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-BECS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_BECS`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_Ecl`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_PC`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-DIVERS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_DIVERS`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TS`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TC`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_A`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_M`,
	// 		urls[11]
	// 	);
  
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL Gorges`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_PH`,
	// 		urls[12]
	// 	);
  
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Spots CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_TS`,
	// 		urls[13]
	// 	);
  
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Spots CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_TC`,
	// 		urls[14]
	// 	);
  
	// 	const CHILD_16: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_Commut_A`,
	// 		urls[15]
	// 	);
  
	// 	const CHILD_17: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_Commut_M`,
	// 		urls[16]
	// 	);
  
	// 	const CHILD_18: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL Spots`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Spots_PH`,
	// 		urls[17]
	// 	);
  
	// 	const CHILD_19: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Mezza_TS`,
	// 		urls[18]
	// 	);
  
	// 	const CHILD_20: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Mezza_TC`,
	// 		urls[19]
	// 	);
  
	// 	const CHILD_21: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Mezza_Commut_A`,
	// 		urls[20]
	// 	);
  
	// 	const CHILD_22: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Mezza_Commut_M`,
	// 		urls[21]
	// 	);
  
	// 	const CHILD_23: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Mezza_PH`,
	// 		urls[22]
	// 	);
  
	// 	const CHILD_24: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Vinci_TS`,
	// 		urls[23]
	// 	);
  
	// 	const CHILD_25: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Gorges CHC`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Vinci_TC`,
	// 		urls[24]
	// 	);
  
	// 	const CHILD_26: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Vinci_Commut_A`,
	// 		urls[25]
	// 	);
  
	// 	const CHILD_27: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Vinci_Commut_M`,
	// 		urls[26]
	// 	);
  
	// 	const CHILD_28: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Vinci_PH`,
	// 		urls[27]
	// 	);
  
	// 	const CHILD_29: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TS`,
	// 		urls[28]
	// 	);
  
	// 	const CHILD_30: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TC`,
	// 		urls[29]
	// 	);
  
	// 	const CHILD_31: InputDataEndpoint = new InputDataEndpoint(
	// 		`1-Auto / 2 Marche Force/ 3-Arret`,
	// 		0,
	// 		"",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_Commut`,
	// 		urls[30]
	// 	);
  
	// 	const CHILD_32: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 1/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_PH`,
	// 		urls[31]
	// 	);
  
	// 	const CHILD_33: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 2/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TS`,
	// 		urls[32]
	// 	);
  
	// 	const CHILD_34: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 2/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TC`,
	// 		urls[33]
	// 	);
  
	// 	const CHILD_35: InputDataEndpoint = new InputDataEndpoint(
	// 		`1-Auto / 2 Marche Force/ 3-Arret`,
	// 		0,
	// 		"",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_Commut`,
	// 		urls[34]
	// 	);
  
	// 	const CHILD_36: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 2/3 Passerelle`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_PH`,
	// 		urls[35]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12, CHILD_13, CHILD_14, CHILD_15, CHILD_16,
	// 		CHILD_17, CHILD_18, CHILD_19, CHILD_20, CHILD_21, CHILD_22, CHILD_23, CHILD_24, CHILD_25, CHILD_26, CHILD_27, CHILD_28, CHILD_29, CHILD_30, CHILD_31, CHILD_32, CHILD_33, CHILD_34, CHILD_35, CHILD_36);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
	// /**
	// 	 * @private
	// 	 * @returns {generateDataTDGG}
	// 	 * @memberof InputData
	// 	 */
	// private generateDataTDGG(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-BECS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_BECS`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_Ecl`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_PC`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-CVC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CVC`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Gorges`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TS`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Gorges`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_TC`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_A`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Gorges_Commut_M`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Circulation_TS`,
	// 		urls[11]
	// 	);
  
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Circulation_TC`,
	// 		urls[12]
	// 	);
  
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position AUTO`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Circulation_Commut_A`,
	// 		urls[13]
	// 	);
  
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commutateur Position Marche`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_Circulation_Commut_M`,
	// 		urls[14]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12, CHILD_13, CHILD_14, CHILD_15);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
	// /**
	// 	 * @private
	// 	 * @returns {generateDataTDP_N01}
	// 	 * @memberof InputData
	// 	 */
	// private generateDataTDP_N01(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur Delestage`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IDEL`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Perte Communication Equippement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-CVC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CVC`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_Ecl`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Generral`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_General`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_PC`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TC`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TS`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_PH`,
	// 		urls[11]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
  
	// /**
	// * @private
	// * @returns {generateDataTDP}
	// * @memberof InputData
	// */
	// private generateDataTDP(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur Delestage`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IDEL`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Perte Communication Equippement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[4]
	// 	);
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-CVC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CVC`,
	// 		urls[5]
	// 	);
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_Ecl`,
	// 		urls[6]
	// 	);
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Generral`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_General`,
	// 		urls[7]
	// 	);
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_PC`,
	// 		urls[8]
	// 	);
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 1/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TC`,
	// 		urls[9]
	// 	);
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 1/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TS`,
	// 		urls[10]
	// 	);
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 1/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_PH`,
	// 		urls[11]
	// 	);
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TC`,
	// 		urls[12]
	// 	);
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TS`,
	// 		urls[13]
	// 	);
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_PH`,
	// 		urls[14]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12, CHILD_13, CHILD_14, CHILD_15);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
	// /**
	// * @private
	// * @returns {generateDataTDP_ECL_TER}
	// * @memberof InputData
	// */
	// private generateDataTDP_ECL_TER(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur Delestage`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IDEL`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Perte Communication Equippement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-CVC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CVC`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_Ecl`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-Generral`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_General`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_PC`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 1/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TC`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 1/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_TS`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 1/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_1_3_PH`,
	// 		urls[11]
	// 	);
  
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TC`,
	// 		urls[12]
	// 	);
  
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_TS`,
	// 		urls[13]
	// 	);
  
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_2_3_PH`,
	// 		urls[14]
	// 	);
  
	// 	const CHILD_16: InputDataEndpoint = new InputDataEndpoint(
	// 		`Commande GTB ECL 2/3 Circulation`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_TERRASSE_TC`,
	// 		urls[15]
	// 	);
  
	// 	const CHILD_17: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat GTB ECL TERRASSE`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_TERRASSE_TS`,
	// 		urls[16]
	// 	);
  
	// 	const CHILD_18: InputDataEndpoint = new InputDataEndpoint(
	// 		`Programme Horaire GTB ECL TERRASSE`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} ECL_TERRASSE_PH`,
	// 		urls[17]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12,
	// 		CHILD_13, CHILD_14, CHILD_15, CHILD_16, CHILD_17, CHILD_18);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
	// /**
	// * @private
	// * @returns {generateDataTDO}
	// * @memberof InputData
	// */
	// private generateDataTDO(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Depart_Aux Synthese Position Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_OF`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Depart_Aux Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Depart_N Synthese Position Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_OF`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Depart_N Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Depart_R Synthese Position Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_OF`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Depart_R Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Alarme Perte Communication Equipement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[8]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
	// /**
	//  * @private
	//  * @returns {generateDataTDH}
	//  * @memberof InputData
	//  */
	// private generateDataTDH(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Alarme Perte Communication Equipement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Parafoudre`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PARA`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[4]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
	// /**
	// * @private
	// * @returns {generateDataTDH_N00}
	// * @memberof InputData
	// */
	// private generateDataTDH_N00(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Alarme Perte Communication Equipement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Parafoudre`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PARA`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Interrupteur COFFRET BYPASS`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IBYP`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-CVC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CVC`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-General`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} General`,
	// 		urls[7]
	// 	);
  
  
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
	// /**
	//  * @private
	//  * @returns {generateDataTDS}
	//  * @memberof InputData
	//  */
	// private generateDataTDS(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Position Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_OF`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[2]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
	// /**
	// * @private
	// * @returns {generateDataTDS_N00}
	// * @memberof InputData
	// */
	// private generateDataTDS_N00(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Interrupteur S1`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IG_S1`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Interrupteur S2`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IG_S2`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Inverseur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Inv`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat Presence Tension 1`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT_S1`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat Presence Tension 2`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT_S2`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Position Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_OF`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-CVC`,
	// 		0,
	// 		"KWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CVC`,
	// 		urls[7]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
	// /**
	// * @private
	// * @returns {generateDataOHQ}
	// * @memberof InputData
	// */
	// private generateDataOHQ(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Tension Input Phase 1 Onduleur`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L1_V`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Intensité Input Phase 1 Onduleur`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L1_I`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Puissance Input Phase 1 Onduleur`,
	// 		0,
	// 		"W",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L1_P`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Tension Input Phase 1 Onduleur`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L2_V`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Intensité Input Phase 1 Onduleur`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L2_I`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Puissance Input Phase 1 Onduleur`,
	// 		0,
	// 		"W",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L2_P`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Tension Input Phase 1 Onduleur`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L3_V`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Intensité Input Phase 1 Onduleur`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L3_I`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`Puissance Input Phase 1 Onduleur`,
	// 		0,
	// 		"W",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IN_L3_P`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`Tension Output Phase 1 Onduleur`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L1_V`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Intensité Output Phase 1 Onduleur`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L1_I`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Puissance Output Phase 1 Onduleur`,
	// 		0,
	// 		"W",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L1_P`,
	// 		urls[11]
	// 	);
  
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Tension Output Phase 2 Onduleur`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L2_V`,
	// 		urls[12]
	// 	);
  
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Intensité Output Phase 2 Onduleur`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L2_I`,
	// 		urls[13]
	// 	);
  
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Puissance Output Phase 2 Onduleur`,
	// 		0,
	// 		"W",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L2_P`,
	// 		urls[14]
	// 	);
  
	// 	const CHILD_16: InputDataEndpoint = new InputDataEndpoint(
	// 		`Tension Output Phase 3 Onduleur`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L3_V`,
	// 		urls[15]
	// 	);
  
	// 	const CHILD_17: InputDataEndpoint = new InputDataEndpoint(
	// 		`Intensité Output Phase 3 Onduleur`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L3_I`,
	// 		urls[16]
	// 	);
  
	// 	const CHILD_18: InputDataEndpoint = new InputDataEndpoint(
	// 		`Puissance Output Phase 3 Onduleur`,
	// 		0,
	// 		"W",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Out_L3_P`,
	// 		urls[17]
	// 	);
  
	// 	const CHILD_19: InputDataEndpoint = new InputDataEndpoint(
	// 		`Intensité Batterie Onduleur`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Batterie_I`,
	// 		urls[18]
	// 	);
  
	// 	const CHILD_20: InputDataEndpoint = new InputDataEndpoint(
	// 		`Charge Restante Batterie Onduleur`,
	// 		0,
	// 		"%",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Batterie_Load`,
	// 		urls[19]
	// 	);
  
	// 	const CHILD_21: InputDataEndpoint = new InputDataEndpoint(
	// 		`Alarme Batterie Faible`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Batterie_Low`,
	// 		urls[20]
	// 	);
  
	// 	const CHILD_22: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat Chargement Batterie`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Batterie_OK`,
	// 		urls[21]
	// 	);
  
	// 	const CHILD_23: InputDataEndpoint = new InputDataEndpoint(
	// 		`Température Batterie Onduleur`,
	// 		0,
	// 		"Celsius",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Batterie_Temp`,
	// 		urls[22]
	// 	);
  
	// 	const CHILD_24: InputDataEndpoint = new InputDataEndpoint(
	// 		`Tension Batterie Onduleur`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Batterie_V`,
	// 		urls[23]
	// 	);
  
	// 	const CHILD_25: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Défaut Onduleur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} TA`,
	// 		urls[24]
	// 	);
  
	// 	const CHILD_26: InputDataEndpoint = new InputDataEndpoint(
	// 		`Fonctionnement en mode Bypass`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} OnBypass`,
	// 		urls[25]
	// 	);
  
	// 	const CHILD_27: InputDataEndpoint = new InputDataEndpoint(
	// 		`Fonctionnement en mode Redresseur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} OnRectifier`,
	// 		urls[26]
	// 	);
  
	// 	const CHILD_28: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat Autorisation fonctionnement Bypass`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} MainsBypass`,
	// 		urls[27]
	// 	);
  
	// 	const CHILD_29: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat Autorisation fonctionnement Redresseur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} MainsRectifier`,
	// 		urls[28]
	// 	);
  
	// 	const CHILD_30: InputDataEndpoint = new InputDataEndpoint(
	// 		`Alarme Surcharge Output Onduleur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} OverLoad`,
	// 		urls[29]
	// 	);
  
	// 	const CHILD_31: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Fonctionnement Output Onduleur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} OutputBad`,
	// 		urls[30]
	// 	);
  
	// 	const CHILD_32: InputDataEndpoint = new InputDataEndpoint(
	// 		`Fonctionnement en mode Inverseur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} OnInverter`,
	// 		urls[31]
	// 	);
  
	// 	const CHILD_33: InputDataEndpoint = new InputDataEndpoint(
	// 		`Fonctionnement en mode Manuel`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} OnManual`,
	// 		urls[32]
	// 	);
  
	// 	const CHILD_34: InputDataEndpoint = new InputDataEndpoint(
	// 		`Utilisation de la Charge`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} LoadOff`,
	// 		urls[33]
	// 	);
  
	// 	const CHILD_35: InputDataEndpoint = new InputDataEndpoint(
	// 		`Information Maintenance necessaire`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Check`,
	// 		urls[34]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12, CHILD_13, CHILD_14, CHILD_15, CHILD_16, CHILD_17, CHILD_18, CHILD_19, CHILD_20, CHILD_21, CHILD_22, CHILD_23
	// 		, CHILD_24, CHILD_25, CHILD_26, CHILD_27, CHILD_28, CHILD_29, CHILD_30, CHILD_31, CHILD_32, CHILD_33, CHILD_34, CHILD_35);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
	// /**
	// * @private
	// * @returns {generateDataTGB_100}
	// * @memberof InputData
	// */
	// private generateDataTGB_100(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Position Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Coffret_Aux_Synth_OF`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Coffret_Aux_Synth_SD`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Intensité Phase 1-N`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_I1`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Intensité Phase 2-N`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_I2`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Intensité Phase 3-N`,
	// 		0,
	// 		"A",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_I3`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Comptage Energie`,
	// 		0,
	// 		"KWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_Nrj`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Puissance Active`,
	// 		0,
	// 		"KW",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_P`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Tension Phase 1-2`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_U12`,
	// 		urls[7]
	// 	);
  
	// 	const CHILD_9: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Tension Phase 2-3`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_U23`,
	// 		urls[8]
	// 	);
  
	// 	const CHILD_10: InputDataEndpoint = new InputDataEndpoint(
	// 		`TGBT B1 N/R - Tension Phase 3-1`,
	// 		0,
	// 		"V",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CPT_CME_101_U31`,
	// 		urls[9]
	// 	);
  
	// 	const CHILD_11: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q1_OF`,
	// 		urls[10]
	// 	);
  
	// 	const CHILD_12: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q1_SD`,
	// 		urls[11]
	// 	);
  
	// 	const CHILD_13: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q2_OF`,
	// 		urls[12]
	// 	);
  
	// 	const CHILD_14: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q2_SD`,
	// 		urls[13]
	// 	);
  
	// 	const CHILD_15: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q3_OF`,
	// 		urls[14]
	// 	);
  
	// 	const CHILD_16: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q3_SD`,
	// 		urls[15]
	// 	);
  
	// 	const CHILD_17: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q4_OF`,
	// 		urls[16]
	// 	);
  
	// 	const CHILD_18: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		0,
	// 		"W",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q4_SD`,
	// 		urls[17]
	// 	);
  
	// 	const CHILD_19: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q5_OF`,
	// 		urls[18]
	// 	);
  
	// 	const CHILD_20: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q5_SD`,
	// 		urls[19]
	// 	);
  
	// 	const CHILD_21: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q6_OF`,
	// 		urls[20]
	// 	);
  
	// 	const CHILD_22: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q6_SD`,
	// 		urls[21]
	// 	);
  
	// 	const CHILD_23: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q7_OF`,
	// 		urls[22]
	// 	);
  
	// 	const CHILD_24: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q7_SD`,
	// 		urls[23]
	// 	);
  
	// 	const CHILD_25: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q8_OF`,
	// 		urls[24]
	// 	);
  
	// 	const CHILD_26: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q8_SD`,
	// 		urls[25]
	// 	);
  
	// 	const CHILD_27: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q9_OF`,
	// 		urls[26]
	// 	);
  
	// 	const CHILD_28: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q9_SD`,
	// 		urls[27]
	// 	);
  
	// 	const CHILD_29: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q10_OF`,
	// 		urls[28]
	// 	);
  
	// 	const CHILD_30: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q10_SD`,
	// 		urls[29]
	// 	);
  
	// 	const CHILD_31: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q11_OF`,
	// 		urls[30]
	// 	);
  
	// 	const CHILD_32: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q11_SD`,
	// 		urls[31]
	// 	);
  
	// 	const CHILD_33: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q12_OF`,
	// 		urls[32]
	// 	);
  
	// 	const CHILD_34: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q12_SD`,
	// 		urls[33]
	// 	);
  
	// 	const CHILD_35: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q13_OF`,
	// 		urls[34]
	// 	);
  
	// 	const CHILD_36: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q13_SD`,
	// 		urls[35]
	// 	);
  
	// 	const CHILD_37: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q14_OF`,
	// 		urls[36]
	// 	);
  
	// 	const CHILD_38: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q14_SD`,
	// 		urls[37]
	// 	);
  
	// 	const CHILD_39: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q15_OF`,
	// 		urls[38]
	// 	);
  
	// 	const CHILD_40: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q15_SD`,
	// 		urls[39]
	// 	);
  
	// 	const CHILD_41: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q16_OF`,
	// 		urls[40]
	// 	);
  
	// 	const CHILD_42: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q16_SD`,
	// 		urls[41]
	// 	);
  
	// 	const CHILD_43: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q17_OF`,
	// 		urls[42]
	// 	);
  
	// 	const CHILD_44: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q17_SD`,
	// 		urls[43]
	// 	);
  
	// 	const CHILD_45: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q18_OF`,
	// 		urls[44]
	// 	);
  
	// 	const CHILD_46: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q18_SD`,
	// 		urls[45]
	// 	);
  
	// 	const CHILD_47: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q19_OF`,
	// 		urls[46]
	// 	);
  
	// 	const CHILD_48: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q19_SD`,
	// 		urls[47]
	// 	);
  
	// 	const CHILD_49: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q20_OF`,
	// 		urls[48]
	// 	);
  
	// 	const CHILD_50: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q20_SD`,
	// 		urls[49]
	// 	);
  
	// 	const CHILD_51: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q21_OF`,
	// 		urls[50]
	// 	);
  
	// 	const CHILD_52: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q21_SD`,
	// 		urls[51]
	// 	);
  
	// 	const CHILD_53: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q22_OF`,
	// 		urls[52]
	// 	);
  
	// 	const CHILD_54: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q22_SD`,
	// 		urls[53]
	// 	);
  
	// 	const CHILD_55: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q23_OF`,
	// 		urls[54]
	// 	);
  
	// 	const CHILD_56: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q23_SD`,
	// 		urls[55]
	// 	);
  
	// 	const CHILD_57: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q24_OF`,
	// 		urls[56]
	// 	);
  
	// 	const CHILD_58: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q24_SD`,
	// 		urls[57]
	// 	);
  
	// 	const CHILD_59: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q25_OF`,
	// 		urls[58]
	// 	);
  
	// 	const CHILD_60: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q25_SD`,
	// 		urls[59]
	// 	);
  
	// 	const CHILD_61: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q26_OF`,
	// 		urls[60]
	// 	);
  
	// 	const CHILD_62: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q26_SD`,
	// 		urls[61]
	// 	);
  
	// 	const CHILD_63: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q27_OF`,
	// 		urls[62]
	// 	);
  
	// 	const CHILD_64: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q27_SD`,
	// 		urls[63]
	// 	);
  
	// 	const CHILD_65: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q28_OF`,
	// 		urls[64]
	// 	);
  
	// 	const CHILD_66: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q28_SD`,
	// 		urls[65]
	// 	);
  
	// 	const CHILD_67: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q29_OF`,
	// 		urls[66]
	// 	);
  
	// 	const CHILD_68: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q29_SD`,
	// 		urls[67]
	// 	);
  
	// 	const CHILD_69: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q30_OF`,
	// 		urls[68]
	// 	);
  
	// 	const CHILD_70: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q30_SD`,
	// 		urls[69]
	// 	);
  
	// 	const CHILD_71: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q31_OF`,
	// 		urls[70]
	// 	);
  
	// 	const CHILD_72: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q31_SD`,
	// 		urls[71]
	// 	);
  
	// 	const CHILD_73: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q32_OF`,
	// 		urls[72]
	// 	);
  
	// 	const CHILD_74: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q32_SD`,
	// 		urls[73]
	// 	);
  
	// 	const CHILD_75: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q33_OF`,
	// 		urls[74]
	// 	);
  
	// 	const CHILD_76: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q33_SD`,
	// 		urls[75]
	// 	);
  
	// 	const CHILD_77: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q34_OF`,
	// 		urls[76]
	// 	);
  
	// 	const CHILD_78: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q34_SD`,
	// 		urls[77]
	// 	);
  
	// 	const CHILD_79: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q35_OF`,
	// 		urls[78]
	// 	);
  
	// 	const CHILD_80: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q35_SD`,
	// 		urls[79]
	// 	);
  
	// 	const CHILD_81: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q36_OF`,
	// 		urls[80]
	// 	);
  
	// 	const CHILD_82: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q36_SD`,
	// 		urls[81]
	// 	);
  
	// 	const CHILD_83: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q37_OF`,
	// 		urls[82]
	// 	);
  
	// 	const CHILD_84: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q37_SD`,
	// 		urls[83]
	// 	);
  
	// 	const CHILD_85: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q38_OF`,
	// 		urls[84]
	// 	);
  
	// 	const CHILD_86: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q38_SD`,
	// 		urls[85]
	// 	);
  
	// 	const CHILD_87: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q39_OF`,
	// 		urls[86]
	// 	);
  
	// 	const CHILD_88: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q39_SD`,
	// 		urls[87]
	// 	);
  
	// 	const CHILD_89: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q40_OF`,
	// 		urls[88]
	// 	);
  
	// 	const CHILD_90: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q40_SD`,
	// 		urls[89]
	// 	);
  
	// 	const CHILD_91: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q41_OF`,
	// 		urls[90]
	// 	);
  
	// 	const CHILD_92: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Q41_SD`,
	// 		urls[91]
	// 	);
  
	// 	const CHILD_93: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} QG_OF`,
	// 		urls[92]
	// 	);
  
	// 	const CHILD_94: InputDataEndpoint = new InputDataEndpoint(
	// 		`Defaut Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} QG_SD`,
	// 		urls[93]
	// 	);
  
	// 	const CHILD_95: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Debrochee Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} QG_Pos_Deb`,
	// 		urls[94]
	// 	);
  
	// 	const CHILD_96: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Embrochee Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} QG_Pos_Emb`,
	// 		urls[95]
	// 	);
  
	// 	const CHILD_97: InputDataEndpoint = new InputDataEndpoint(
	// 		`Position Test Disjoncteur`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} QG_Pos_Test`,
	// 		urls[96]
	// 	);
  
	// 	const CHILD_98: InputDataEndpoint = new InputDataEndpoint(
	// 		`Etat Presence Tension`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PT`,
	// 		urls[97]
	// 	);
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8, CHILD_9, CHILD_10, CHILD_11, CHILD_12, CHILD_13, CHILD_14, CHILD_15, CHILD_16, CHILD_17, CHILD_18, CHILD_19, CHILD_20, CHILD_21, CHILD_22, CHILD_23,
	// 		CHILD_24, CHILD_25, CHILD_26, CHILD_27, CHILD_28, CHILD_29, CHILD_30, CHILD_31, CHILD_32, CHILD_33, CHILD_34, CHILD_35, CHILD_36,
	// 		CHILD_37, CHILD_38, CHILD_39, CHILD_40, CHILD_41, CHILD_42, CHILD_43, CHILD_44, CHILD_45, CHILD_46, CHILD_47, CHILD_48, CHILD_49,
	// 		CHILD_50, CHILD_51, CHILD_52, CHILD_53, CHILD_54, CHILD_55, CHILD_56, CHILD_57, CHILD_58, CHILD_58, CHILD_59, CHILD_60,
	// 		CHILD_61, CHILD_62, CHILD_63, CHILD_64, CHILD_65, CHILD_66, CHILD_67, CHILD_68, CHILD_69, CHILD_70, CHILD_71, CHILD_72,
	// 		CHILD_73, CHILD_74, CHILD_75, CHILD_76, CHILD_77, CHILD_78, CHILD_79, CHILD_80, CHILD_81, CHILD_82, CHILD_83, CHILD_84,
	// 		CHILD_85, CHILD_86, CHILD_87, CHILD_88, CHILD_89, CHILD_90, CHILD_91, CHILD_92, CHILD_93, CHILD_94, CHILD_95, CHILD_96, CHILD_97);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
  
	// /**
	// * @private
	// * @returns {generateDataTDN}
	// * @memberof InputData
	// */
	// private generateDataTDN(id: number, urls: string[], name: string): InputDataDevice {
	// 	function createFunc(
	// 		str: string,
	// 		type: string,
	// 		constructor: typeof InputDataDevice | typeof InputDataEndpointGroup
	// 	): any {
	// 		return new constructor(str, type, str, "");
	// 	}
  
	// 	const res: InputDataDevice = createFunc(
	// 		name + `${id}`,
	// 		"device",
	// 		InputDataDevice
	// 	);
  
	// 	const CHILD_1: InputDataEndpoint = new InputDataEndpoint(
	// 		`Interrupteur General Normal`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} IGN`,
	// 		urls[0]
	// 	);
  
	// 	const CHILD_2: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Position Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_OF`,
	// 		urls[1]
	// 	);
  
	// 	const CHILD_3: InputDataEndpoint = new InputDataEndpoint(
	// 		`Synthese Defaut Disjoncteurs`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Synth_SD`,
	// 		urls[2]
	// 	);
  
	// 	const CHILD_4: InputDataEndpoint = new InputDataEndpoint(
	// 		`Alarme Perte Communication Equipement`,
	// 		true,
	// 		"",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} COM`,
	// 		urls[3]
	// 	);
  
	// 	const CHILD_5: InputDataEndpoint = new InputDataEndpoint(
	// 		`Comptage Energie-CVC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Double,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} CVC`,
	// 		urls[4]
	// 	);
  
	// 	const CHILD_6: InputDataEndpoint = new InputDataEndpoint(
	// 		`Compatage Energie-DIVERS`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} DIVERS`,
	// 		urls[5]
	// 	);
  
	// 	const CHILD_7: InputDataEndpoint = new InputDataEndpoint(
	// 		`Compatage Energie-Eclairage`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} Ecl`,
	// 		urls[6]
	// 	);
  
	// 	const CHILD_8: InputDataEndpoint = new InputDataEndpoint(
	// 		`Compatage Energie-PC`,
	// 		0,
	// 		"kWh",
	// 		InputDataEndpointDataType.Boolean,
	// 		InputDataEndpointType.Other,
	// 		`DEVICE-${id} PC`,
	// 		urls[7]
	// 	);
  
  
  
	// 	res.children.push(CHILD_1, CHILD_2, CHILD_3, CHILD_4, CHILD_5, CHILD_6, CHILD_7, CHILD_8);
	// 	this.devices.push(res)
	// 	return res;
	// }
  
  
  
  
  
  }
  
  export { InputData };
  