<!-- DO NOT EDIT README.md (It will be overridden by README.hbs) -->

# spinal-organ-network_sample

Sample organ to demonstrate how to use the spinal-model-bmsnetwork.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Description](#description)
- [configuration](#configuration)
- [API](#api)
  - [Interface](#interface)
    - [ConfigOrgan](#configorgan)
  - [Classes](#classes)
  - [InputData](#inputdata)
    - [new InputData()](#new-inputdata)
    - [inputData.setOnDataCBFunc(onData)](#inputdatasetondatacbfuncondata)
    - [InputData.InputData](#inputdatainputdata)
      - [new InputData()](#new-inputdata-1)
  - [InputDataDevice](#inputdatadevice)
    - [InputDataDevice.InputDataDevice](#inputdatadeviceinputdatadevice)
      - [new InputDataDevice([name], [type], [id], [path])](#new-inputdatadevicename-type-id-path)
  - [InputDataEndpoint](#inputdataendpoint)
    - [InputDataEndpoint.InputDataEndpoint](#inputdataendpointinputdataendpoint)
      - [new InputDataEndpoint([name], [currentValue], [unit], [dataType], [type], [id], [path])](#new-inputdataendpointname-currentvalue-unit-datatype-type-id-path)
  - [InputDataEndpointGroup](#inputdataendpointgroup)
    - [InputDataEndpointGroup.InputDataEndpointGroup](#inputdataendpointgroupinputdataendpointgroup)
      - [new InputDataEndpointGroup([name], [type], [id], [path])](#new-inputdataendpointgroupname-type-id-path)
  - [NetworkProcess](#networkprocess)
    - [networkProcess.init(forgeFile, configOrgan) ⇒ <code>Promise.&lt;void&gt;</code>](#networkprocessinitforgefile-configorgan-%E2%87%92-codepromiseltvoidgtcode)
    - [networkProcess.updateData(obj)](#networkprocessupdatedataobj)
    - [NetworkProcess.NetworkProcess](#networkprocessnetworkprocess)
      - [new NetworkProcess(inputData)](#new-networkprocessinputdata)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Description

This organ create 3 Devices using interface implementing `spinal-model-bmsnetwork` `inputData`'s interface.

The data in the `Graph Manager` will be as the following
- Graph
  - Network
    - NetworkVirtual
      - Device 1
        - Device 1 child_1 - device
          - Device 1 child_1_1 - groupendpoint
            - Device 1 child_1_1_1 - endpoint
        - Device 1 child_2 - groupendpoint
          - Device 1 child_2_1 - endpoint
        - Device 1 child_3 - endpoint
      - ...

The service Use the following key in `SpinalNode.info` to search matching element

SpinalNode type | info Key
-|-
<code>SpinalContext\<any\></code> | ContextType
<code>SpinalNode\<SpinalBmsNetwork\></code> | networkType
<code>SpinalNode\<SpinalBmsDevice\></code> | idNetWork
<code>SpinalNode\<SpinalBmsEndpointGroup\></code> | idNetWork
<code>SpinalNode\<SpinalBmsEndpoint\></code> | idNetWork

# configuration
Edit the file `config.json5` so the organ can connect to the server the be able to get the forgefile with it `path`.

The organ will search for `organ.ContextType` and  `organ.networkType` then create it if not found.

```js
{
  spinalConnector: {
    user: 168, // user id - process.env.SPINAL_USER_ID
    password: "JHGgcz45JKilmzknzelf65ddDadggftIO98P", // user password - process.env.SPINAL_USER_ID 
    host: "localhost", // can be an ip address - process.env.SPINALHUB_IP
    port: 7777 // port - process.env.SPINALHUB_PORT
  },
  file: {
    // path to a digital twin in spinalhub filesystem || process.env.SPINAL_DTWIN_PATH
    path: '/__users__/admin/deiv4' 
  },
  organ: {
    contextName: "Network",
    contextType: "Network",
    networkType: "NetworkVirtual",
    networkName: "NetworkVirtual"
  }
}
```

# API

## Interface

<a name="ConfigOrgan"></a>

### ConfigOrgan
**Kind**: interface

| Param | Type | Value | Comment |
| --- | --- | --- | --- |
| contextName | <code>string</code> | | 
| contextType | <code>string</code> | | 
| networkType | <code>string</code> | | 
| networkName | <code>string</code> | | 


## Classes

<dl>
<dt><a href="#InputData">InputData</a></dt>
<dd></dd>
<dt><a href="#InputDataDevice">InputDataDevice</a></dt>
<dd></dd>
<dt><a href="#InputDataEndpoint">InputDataEndpoint</a></dt>
<dd></dd>
<dt><a href="#InputDataEndpointGroup">InputDataEndpointGroup</a></dt>
<dd></dd>
<dt><a href="#NetworkProcess">NetworkProcess</a></dt>
<dd></dd>
</dl>

<a name="InputData"></a>

## InputData
**Kind**: global class  

* [InputData](#InputData)
    * [new InputData()](#new_InputData_new)
    * _instance_
        * [.setOnDataCBFunc(onData)](#InputData+setOnDataCBFunc)
    * _static_
        * [.InputData](#InputData.InputData)
            * [new InputData()](#new_InputData.InputData_new)

<a name="new_InputData_new"></a>

### new InputData()
<p>Simulation Class to generate data from an extrenal source</p>

<a name="InputData+setOnDataCBFunc"></a>

### inputData.setOnDataCBFunc(onData)
**Kind**: instance method of [<code>InputData</code>](#InputData)  

| Param | Type |
| --- | --- |
| onData | <code>onDataFunctionType</code> | 

<a name="InputData.InputData"></a>

### InputData.InputData
**Kind**: static class of [<code>InputData</code>](#InputData)  
<a name="new_InputData.InputData_new"></a>

#### new InputData()
<p>Creates an instance of InputData.</p>

<a name="InputDataDevice"></a>

## InputDataDevice
**Kind**: global class  
**Implements**: <code>idDevice</code>  
**Export**:   
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> |  |
| name | <code>string</code> |  |
| type | <code>string</code> |  |
| path | <code>string</code> |  |
| children | <code>Array.&lt;(InputDataDevice\|InputDataEndpoint\|InputDataEndpointGroup)&gt;</code> |  |
| nodeTypeName | <code>string</code> | <p>equals SpinalBmsDevice.nodeTypeName</p> |


* [InputDataDevice](#InputDataDevice)
    * [.InputDataDevice](#InputDataDevice.InputDataDevice)
        * [new InputDataDevice([name], [type], [id], [path])](#new_InputDataDevice.InputDataDevice_new)

<a name="InputDataDevice.InputDataDevice"></a>

### InputDataDevice.InputDataDevice
**Kind**: static class of [<code>InputDataDevice</code>](#InputDataDevice)  
<a name="new_InputDataDevice.InputDataDevice_new"></a>

#### new InputDataDevice([name], [type], [id], [path])
<p>Creates an instance of InputDataDevice.</p>


| Param | Type | Default |
| --- | --- | --- |
| [name] | <code>string</code> | <code>&quot;&#x27;default device name&#x27;&quot;</code> | 
| [type] | <code>string</code> | <code>&quot;&#x27;default device type&#x27;&quot;</code> | 
| [id] | <code>string</code> | <code>&quot;genUID(&#x27;InputDataDevice&#x27;)&quot;</code> | 
| [path] | <code>string</code> | <code>&quot;&#x27;default device path&#x27;&quot;</code> | 

<a name="InputDataEndpoint"></a>

## InputDataEndpoint
**Kind**: global class  
**Implements**: <code>idEndpoint</code>  
**Export**:   
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> |  |
| name | <code>string</code> |  |
| path | <code>string</code> |  |
| currentValue | <code>number</code> \| <code>string</code> |  |
| unit | <code>string</code> |  |
| dataType | <code>InputDataEndpointDataType</code> |  |
| type | <code>InputDataEndpointType</code> |  |
| nodeTypeName | <code>string</code> | <p>equal SpinalBmsEndpoint.nodeTypeName</p> |
| timeseries | <code>Array.&lt;any&gt;</code> |  |


* [InputDataEndpoint](#InputDataEndpoint)
    * [.InputDataEndpoint](#InputDataEndpoint.InputDataEndpoint)
        * [new InputDataEndpoint([name], [currentValue], [unit], [dataType], [type], [id], [path])](#new_InputDataEndpoint.InputDataEndpoint_new)

<a name="InputDataEndpoint.InputDataEndpoint"></a>

### InputDataEndpoint.InputDataEndpoint
**Kind**: static class of [<code>InputDataEndpoint</code>](#InputDataEndpoint)  
<a name="new_InputDataEndpoint.InputDataEndpoint_new"></a>

#### new InputDataEndpoint([name], [currentValue], [unit], [dataType], [type], [id], [path])
<p>Creates an instance of InputDataEndpoint.</p>


| Param | Type | Default |
| --- | --- | --- |
| [name] | <code>string</code> | <code>&quot;&#x27;default endpoint name&#x27;&quot;</code> | 
| [currentValue] | <code>number</code> \| <code>string</code> | <code>0</code> | 
| [unit] | <code>string</code> | <code>&quot;&#x27;unit&#x27;&quot;</code> | 
| [dataType] | <code>InputDataEndpointDataType</code> | <code>InputDataEndpointDataType.Integer</code> | 
| [type] | <code>InputDataEndpointType</code> | <code>InputDataEndpointType.Other</code> | 
| [id] | <code>string</code> | <code>&quot;genUID(&#x27;InputDataEndpoint&#x27;)&quot;</code> | 
| [path] | <code>string</code> | <code>&quot;&#x27;default endpoint path&#x27;&quot;</code> | 

<a name="InputDataEndpointGroup"></a>

## InputDataEndpointGroup
**Kind**: global class  
**Implements**: <code>idEndpointGroup</code>  
**Export**:   
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> |  |
| name | <code>string</code> |  |
| type | <code>string</code> |  |
| path | <code>string</code> |  |
| children | [<code>Array.&lt;InputDataEndpoint&gt;</code>](#InputDataEndpoint) |  |
| nodeTypeName | <code>string</code> | <p>equals SpinalBmsEndpointGroup.nodeTypeName</p> |


* [InputDataEndpointGroup](#InputDataEndpointGroup)
    * [.InputDataEndpointGroup](#InputDataEndpointGroup.InputDataEndpointGroup)
        * [new InputDataEndpointGroup([name], [type], [id], [path])](#new_InputDataEndpointGroup.InputDataEndpointGroup_new)

<a name="InputDataEndpointGroup.InputDataEndpointGroup"></a>

### InputDataEndpointGroup.InputDataEndpointGroup
**Kind**: static class of [<code>InputDataEndpointGroup</code>](#InputDataEndpointGroup)  
<a name="new_InputDataEndpointGroup.InputDataEndpointGroup_new"></a>

#### new InputDataEndpointGroup([name], [type], [id], [path])
<p>Creates an instance of InputDataEndpointGroup.</p>


| Param | Type | Default |
| --- | --- | --- |
| [name] | <code>string</code> | <code>&quot;&#x27;default EndpointGroup name&#x27;&quot;</code> | 
| [type] | <code>string</code> | <code>&quot;&#x27;default EndpointGroup type&#x27;&quot;</code> | 
| [id] | <code>string</code> | <code>&quot;genUID(&#x27;InputDataEndpointGroup&#x27;)&quot;</code> | 
| [path] | <code>string</code> | <code>&quot;&#x27;default EndpointGroup path&#x27;&quot;</code> | 

<a name="NetworkProcess"></a>

## NetworkProcess
**Kind**: global class  
**Export**:   

* [NetworkProcess](#NetworkProcess)
    * _instance_
        * [.init(forgeFile, configOrgan)](#NetworkProcess+init) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.updateData(obj)](#NetworkProcess+updateData)
    * _static_
        * [.NetworkProcess](#NetworkProcess.NetworkProcess)
            * [new NetworkProcess(inputData)](#new_NetworkProcess.NetworkProcess_new)

<a name="NetworkProcess+init"></a>

### networkProcess.init(forgeFile, configOrgan) ⇒ <code>Promise.&lt;void&gt;</code>
**Kind**: instance method of [<code>NetworkProcess</code>](#NetworkProcess)  

| Param | Type |
| --- | --- |
| forgeFile | <code>ForgeFileItem</code> | 
| configOrgan | <code>ConfigOrgan</code> | 

<a name="NetworkProcess+updateData"></a>

### networkProcess.updateData(obj)
**Kind**: instance method of [<code>NetworkProcess</code>](#NetworkProcess)  

| Param | Type |
| --- | --- |
| obj | [<code>InputDataDevice</code>](#InputDataDevice) | 

<a name="NetworkProcess.NetworkProcess"></a>

### NetworkProcess.NetworkProcess
**Kind**: static class of [<code>NetworkProcess</code>](#NetworkProcess)  
<a name="new_NetworkProcess.NetworkProcess_new"></a>

#### new NetworkProcess(inputData)
<p>Creates an instance of NetworkProcess.</p>


| Param | Type |
| --- | --- |
| inputData | [<code>InputData</code>](#InputData) | 

