const bToa= require ('btoa');
const request = require('request');
  const utf8 = require('utf8');
  const iconv = require('iconv-lite');
  const q = require("q");
  const config = require("../../../config.json5")
export class Token{
private static token=null;
public static getToken() {
    if (this.token){
    return Promise.resolve(this.token);
    return new Promise((resolve, reject) => {
        console.log("new token");
        const CLIENT_SECRET = "83fb7073-2b01-4aa7-9874-b083e7af3eee";
        const CLIENT_ID = "WST";
        const token = bToa(`${CLIENT_ID}:${CLIENT_SECRET}`);
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
        this.token = null
        console.error(error)
        reject(error)
        } else if (response.statusCode != 200) {
        this.token = null
        reject(`Expected status code 200 but received ${response.statusCode}.`)
        return;
        } else {
        this.token = body;
        resolve(this.token);
        }
        })
        })
    }
}
  }