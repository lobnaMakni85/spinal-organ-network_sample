import ConvertExcel from "./convertExcel";
import { readFile, writeFile } from 'fs';
import { normalize } from "path";
import * as lodash from "lodash";

const groupByEtage = (array) => {
   const etages = lodash.groupBy(array, (item) => item.Etage);
   lodash.forEach(etages, (value, key) => {
      etages[key] = lodash.groupBy(etages[key], function (item) {
         return item.Equipement;
      });
   });
   etages
   return etages;
}

const createFileByEtage = (etage, data) => {
   writeFile(`${etage}JSON.stringify(data).json`, JSON.stringify(data), (err) => {
      if (err) console.error(err);
      else {
         console.log("The written has the following contents:");
      }
   });
}

const getUrl = (object) => {
   const begin = `${object.Batiment}/${object.Etage}/${object.Group}/${object.Equipement}/`;
   const end = Object.keys(object).filter(el => el.includes("Variable")).map(el => object[el]).join("/");
   return normalize(`${begin}/${end}`).replace(/\/$/, "");
}

export const getExcelToJSON = (lienExcelBat) => {
   return new Promise((resolve, reject) => {
      readFile(lienExcelBat, async (err, data) => {
         if (err) reject;
         const convertExcel = new ConvertExcel();
         const dataJson = await convertExcel.toJson(data);
         const res = [];
         Object.keys(dataJson).forEach((key) => {

            res.push(...dataJson[key].map(el => {
               el.url = getUrl(el);
               return el;
            }
            )

            );

         })

         //console.log(res);

         const formated = groupByEtage(res);
         lodash.forEach(formated, (value, key) => {
            createFileByEtage(key, value);
         });
         resolve(formated);
      }

      );
   });
}