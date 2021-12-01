import {
  Student,
  fetchParams,
  fetchAll,
  fetchMosyle,
  getInfo,
  getClassList,
} from "./fetch.js";
import csv from "csvtojson";
import * as fastcsv from "fast-csv";
import fs from "fs";

import Prisma from "@prisma/client";
import { contains } from "class-validator";
const { PrismaClient } = Prisma;
const prisma = new PrismaClient();

async function importStudents() {
  const students = await fetchAll("students");
  await prisma.student.deleteMany({});

  await Promise.all(
    students.map(async (student) => {
      //console.log(student);
      //if (student.student_id && student.gender) {
      await prisma.student.create({
        data: {
          id: student.id,
          //student_id: parseInt(student.student_id),
          mb_student_id: student.student_id,
          archived: student.archived,
          first_name: student.first_name,
          last_name: student.last_name,
          gender: student.gender,
          email: student.email,
          birthday: student.birthday,
          grade: student.class_grade,
        },
      });
      //}
    })
  );
}

async function importParents() {
  const parents = await fetchAll("parents");
  await prisma.parent.deleteMany({});

  for (const parent of parents) {
    //console.log(parent);
    await prisma.parent.create({
      data: {
        id: parent.id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        email: parent.email,
        phone_number: parent.phone_number,
        archived: parent.archived,
        children: {
          create: parent.children.map((child) => {
            return {
              relationship: child.relationship.name,
              student: {
                connect: {
                  id: child.id,
                },
              },
            };
          }),
        },
      },
    });
  }
}

async function importTeachers() {
  const teachers = await fetchAll("teachers");
  await prisma.teacher.deleteMany({});

  await Promise.all(
    teachers.map(async (teacher) => {
      //console.log(teacher);
      if (teacher.id && teacher.email) {
        await prisma.teacher.create({
          data: {
            id: parseInt(teacher.id),
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email,
          },
        });
      }
    })
  );
}

async function importClasses() {
  const classes = await fetchAll("classes");
  await prisma.section.deleteMany({});

  await Promise.all(
    classes.map(async (classInfo) => {
      //console.log(classInfo.teachers);
      const teachers_ids = classInfo.teachers.map(<Id>(t: any) => {
        return {
          id: t.teacher_id,
        };
      });
      //console.log(teachers_ids);
      if (classInfo.id && classInfo.name) {
        await prisma.section.create({
          data: {
            id: parseInt(classInfo.id),
            name: classInfo.name,
            start_term_id: classInfo.start_term_id,
            end_term_id: classInfo.end_term_id,
            teachers: {
              connect: teachers_ids,
            },
          },
        });
      }
    })
  );
}

async function importMemberships() {
  const memberships = await fetchAll("memberships");

  for (const studentClass of memberships) {
    if (studentClass.role === "Student") {
      const class_id = studentClass.class_id;
      const student_id = studentClass.user_id;
      //console.log(student_id + "-" + class_id);

      const studentCount = await prisma.student.count({
        where: {
          id: student_id,
        },
      });
      const classCount = await prisma.section.count({
        where: {
          id: class_id,
        },
      });
      if (studentCount > 0 && classCount > 0) {
        try {
          await prisma.student.update({
            where: {
              id: student_id,
            },
            data: {
              classes: {
                connect: {
                  id: class_id,
                },
              },
            },
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}

async function importDB(importFunctions) {
  console.log(importFunctions);
  for (const importFunction of importFunctions) {
    await importFunction;
  }
}

async function getStudentsDB(grade: number) {
  if (grade < 6) {
    return await prisma.student.findMany({
      where: {
        grade: "Grade " + grade,
      },
      select: {
        first_name: true,
        last_name: true,
        grade: true,
        gender: true,
        birthday: true,
        mb_student_id: true,
        classes: {
          where: {
            name: {
              startsWith: "IB PYP English",
            },
          },
          select: {
            name: true,
            teachers: {
              select: {
                email: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });
  } else {
    return await prisma.student.findMany({
      where: {
        grade: "Grade " + grade,
      },
      select: {
        first_name: true,
        last_name: true,
        grade: true,
        gender: true,
        birthday: true,
        mb_student_id: true,
        classes: {
          select: {
            name: true,
            teachers: {
              select: {
                email: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });
  }
}

async function getParentsToArchive() {
  const parents = await prisma.parent.findMany({
    where: {
      archived: false,
      children: { none: {} },
    },
    select: {
      first_name: true,
      last_name: true,
      archived: true,
      children: {},
    },
  });

  console.log(parents);
  return parents;
}

async function getMapFile() {
  const csvStream = fastcsv.format({ headers: true });
  var writeStream = fs.createWriteStream("map.csv");
  csvStream.pipe(writeStream);

  for (let grade = 6; grade < 11; grade++) {
    const students = await getStudentsDB(grade);
    console.log(students);
    students.map((s) => s.classes.map((c) => console.log(c.teachers)));

    /*
  foreach student
    foreach class
      foreach teacher
        add_row_csv
*/

    students.map((student) => {
      student.classes.map((c) => {
        c.teachers.map((teacher) => {
          const [year, month, day] = student.birthday.split("-", 3);
          const birthdate = month + "/" + day + "/" + year;
          const teacher_id = teacher.email.slice(0, -10);
          console.log(teacher_id);
          csvStream.write({
            "School Name": process.env.SCHOOL,
            "Previous Instructor ID": "",
            "Instructor ID": teacher_id,
            "Instructor Last Name": teacher.last_name,
            "Instructor First Name": teacher.first_name,
            "Instructor Middle Initial": "",
            "User Name": teacher.email,
            "Email Address": teacher.email,
            "Class Name": c.name,
            "Previous Student ID": "",
            "Student ID": student.mb_student_id,
            "Student Last Name": student.last_name,
            "Student First name": student.first_name,
            "Student Middle Initial": "",
            "Student Date of Birth": birthdate,
            "Student Gender": student.gender.charAt(0),
            "Student Grade": grade,
            "Student Ethnic Group Name": "Not Specified or Other",
          });
        });
      });
    });
  }
  csvStream.end();
}

async function mapbyGradeLevel() {
  const csvStream = fastcsv.format({ headers: true });
  var writeStream = fs.createWriteStream("mapbyGradeLevel.csv");
  csvStream.pipe(writeStream);

  for (let grade = 1; grade < 11; grade++) {
    const students = await prisma.student.findMany({
      where: {
        grade: "Grade " + grade,
      },
      select: {
        first_name: true,
        last_name: true,
        grade: true,
        gender: true,
        birthday: true,
        mb_student_id: true,
      },
    });

    console.log(students);

    students.map((student) => {
      const [year, month, day] = student.birthday.split("-", 3);
      const birthdate = month + "/" + day + "/" + year;
      const teacher_id = process.env.TEACHER_ID;
      const teacher_email = process.env.TEACHER_EMAIL;
      console.log(teacher_id);
      csvStream.write({
        "School Name": process.env.SCHOOL,
        "Previous Instructor ID": "",
        "Instructor ID": teacher_id,
        "Instructor Last Name": process.env.TEACHER_LASTNAME,
        "Instructor First Name": process.env.TEACHER_FIRSTNAME,
        "Instructor Middle Initial": "",
        "User Name": teacher_email,
        "Email Address": teacher_email,
        "Class Name": student.grade,
        "Previous Student ID": "",
        "Student ID": student.mb_student_id,
        "Student Last Name": student.last_name,
        "Student First name": student.first_name,
        "Student Middle Initial": "",
        "Student Date of Birth": birthdate,
        "Student Gender": student.gender.charAt(0),
        "Student Grade": grade,
        "Student Ethnic Group Name": "Not Specified or Other",
      });
    });
  }
  csvStream.end();
}

async function importGrades(termId: number) {
  await prisma.termGrade.deleteMany({});

  const classes = await prisma.section.findMany({
    where: {
      AND: [
        {
          start_term_id: {
            lte: termId,
          },
        },
        {
          end_term_id: {
            gte: termId,
          },
        },
      ],
    },
  });
  console.log(classes);
  for (const classInfo of classes) {
    const term_id = classInfo.start_term_id;
    const class_id = classInfo.id;
    const endpoint = `classes/${class_id}/assessments/term/${term_id}/term-grades`;
    const grades = await fetchAll("students", endpoint);
    //console.log(classInfo.name);
    //console.log(grades);
    //console.log(grades.map((g) => console.log(g.term_grade)));
    //console.log("END");
    for (const grade of grades) {
      //console.log("Grade:", grade);
      //console.log("Term Grade:", grade.term_grade);
      const student = await prisma.student.findFirst({
        where: {
          id: grade.id,
        },
      });
      console.log(student);
      if (student) {
        await prisma.student.update({
          where: {
            id: grade.id,
          },
          data: {
            termGrades: {
              create: {
                grade: grade.term_grade.grade,
                comments: grade.term_grade.comments,
                termId: term_id,
                class: {
                  connect: {
                    id: class_id,
                  },
                },
              },
            },
          },
        });
      }
    }
  }
}

//mapbyGradeLevel();
//fetchMosyle("listdevices");

const termId = 108461;
const functionList = [
  //importStudents(),
  //importParents(),
  //importTeachers(),
  //importClasses(),
  //importMemberships(),
  importGrades(termId),
];

async function main() {
  await importDB(functionList);
  console.log("Parents to archive:");
  await getParentsToArchive();
}

//importGrades();

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
