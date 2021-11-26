import fetch from "node-fetch";
import csv from "csvtojson";
import * as fastcsv from "fast-csv";
import fs from "fs";
import { env } from "process";
//const csv = require("csvtojson");

import dotenv from "dotenv";
//const dotenv = require("dotenv");

dotenv.config();
const auth_token = process.env.AUTH_TOKEN;
console.log(auth_token);
const mosyle_token = process.env.MOSYLE_TOKEN;

export interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  archived: boolean;
  gender: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  birthday: string;
  photo_url: string;
  student_id: string;
  homeroom_advisor_id: number;
  attendance_start_date: string;
  class_grade: string;
  class_grade_number: number;
  program: string;
  program_code: string;
  ib_group_id: number;
  year_group_id: number;
  parent_ids?: number[] | null;
  street_address: string;
  street_address_ii: string;
  city: string;
  zipcode: string;
  country: string;
  nationalities?: string[] | null;
  languages?: null[] | null;
  graduating_year: number;
}

export interface Parent {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  archived: boolean;
  timezone: string;
  mobile_phone_number: string;
  child_ids?: number[] | null;
  children?: ChildrenEntity[] | null;
  nationalities?: null[] | null;
  languages?: null[] | null;
  work_phone: string;
}
export interface ChildrenEntity {
  id: number;
  relationship: Relationship;
}
export interface Relationship {
  kind: number;
  name: string;
}
export interface Class {
  name: string;
  section: string;
}

const base_url = "https://api.managebac.com/v2/";

function range(size: number, startAt: number = 0): ReadonlyArray<number> {
  return [...Array(size).keys()].map((i) => i + startAt);
}

export const fetchMB = async (url: string): Promise<any> => {
  const request = {
    method: "GET",
    headers: {
      "content-type": "application/json",
      "auth-token": auth_token,
    },
  };
  console.log(url);
  const response = await fetch(url, request);
  const json = await response.json();
  return json;
};

export const fetchMosyle = async (endpoint): Promise<any> => {
  const body = {
    accessToken: mosyle_token,
    options: {
      os: "mac",
    },
  };
  console.log(JSON.stringify(body));

  const request = {
    method: "POST",
    body: JSON.stringify(body),
    //headers: { "Content-Type": "application/json" },
  };
  const url = "https://managerapi.mosyle.com/v2/" + endpoint;
  const response = await fetch(url, request);
  const json = await response.json();
  console.log(json["response"]["devices"]);
  return json;
};

export const getInfo = async (id: number, endpoint: string): Promise<any> => {
  const url = base_url + endpoint + "/" + id;
  const json = await fetchMB(url);
  return json;
};

export const getClassList = async (id: number): Promise<any> => {
  const url = base_url + "classes" + "/" + id + "/students";
  const json = await fetchMB(url);
  return json;
};

export const fetchParams = async (
  endpoint: string,
  params?: URLSearchParams
): Promise<any> => {
  const url = base_url + endpoint + "?" + params;
  //console.log(url);
  //const request = new Request(url, {

  const json = await fetchMB(url);
  //console.log(json["meta"]["total_pages"]);
  const list = json[endpoint];
  return list;
};

export const fetchAll = async (
  endpoint: string,
  endpoint_url = ""
): Promise<any> => {
  const url2 = endpoint_url === "" ? endpoint : endpoint_url;
  const url = base_url + url2;
  const json = await fetchMB(url);
  //console.log(json);
  const total_pages = json["meta"]["total_pages"];
  let list = json[endpoint];
  console.log(total_pages);
  await Promise.all(
    range(total_pages - 1, 2).map(async (p) => {
      //for (let p = 2; p < total_pages + 1; p++) {
      const pageParams = new URLSearchParams({ page: String(p) });
      const page = await fetchParams(url2, pageParams);
      list = list.concat(page);
      //console.log(page);
    })
  );
  return list;
};

//const classes = [11726302, 11774462, 11774457, 11786518];
//const classes = [];
const getClassesMosyle = async (classes: number[]): Promise<any> => {
  //Foreach student, get parent emails and send email
  const csvFilePath = "student_mosyle_ids.csv";

  const jsonArray = await csv().fromFile(csvFilePath);
  const mosyle_ids = jsonArray.map((s) => s["User ID"]);
  console.log(mosyle_ids[0]);
  console.log(mosyle_ids[1]);

  await Promise.all(
    classes.map(async (c) => {
      const classInfo = await getInfo(c, "classes");
      console.log(classInfo);
      const classList = await getClassList(c);
      console.log(classList);

      const student_ids = classList["student_ids"];
      console.log(student_ids);

      const ps_ids = await Promise.all(
        student_ids.map(async (student) => {
          const studentInfo = await getInfo(student, "students");
          const s = <Student>studentInfo["student"];
          console.log(s.first_name + " " + s.last_name);
          return mosyle_ids.includes(s.student_id) ? s.student_id : s.email;
        })
      );
      console.log("English 7,2B,,TEACHER_ID,SCHOOL,");
      console.log('"' + ps_ids.join(",") + '"');
    })
  );
};
