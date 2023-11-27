import "./config/dotenv.js";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { pool } from "./config/database.js";
import mysql from "mysql";
import session from "express-session";
import cookieParser from "cookie-parser";

const db = mysql.createConnection({
  user: "root",
  password: "thanhtai",
  host: "localhost",
  port: 3306,
  database: "health",
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:3500", "*"], // Allow access from any origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow methods
    credentials: true,
  })
);

// // On the server side (Node.js with Express)
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Credentials", true);
//   next();
// });

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }, // set secure to true when https
  })
);

// middleware to test if authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) next();
  else res.send(false);
}

// middleware to test if admin
function isAdmin(req, res, next) {
  if (req.session.role === "admin") next();
  else res.send(false);
}

function isPatient(req, res, next) {
  if (req.session.role === "patient") next();
  else
    res
      .status(403)
      .send("Forbidden: You don't have the required permissions as a patient.");
}

// middleware to test if nurse
function isNurse(req, res, next) {
  if (req.session.role === "nurse") next();
  else next("route");
}

app.get("/", async (req, res) => {
  if (req.session.user) {
    console.log("session user: ", req.session.user);
    res.send({
      loggedIn: true,
      user: req.session.user,
      role: req.session.role,
      iduser: req.session.iduser,
    });
  } else {
    res.send({ loggedIn: false });
  }
});

app.post("/signup", async (req, res) => {
  console.log("signing up...");
  const {
    firstname,
    lastname,
    middlename,
    ssn,
    age,
    gender,
    race,
    occupation,
    phone,
    address,
    medicalHistory,
    username,
    password,
  } = req.body;
  console.log(
    firstname,
    lastname,
    middlename,
    ssn,
    age,
    gender,
    race,
    occupation,
    phone,
    address,
    medicalHistory,
    username,
    password
  );
  const query =
    "INSERT INTO patient (Fname, Lname, MI, SSN, Age, Gender, Race, `Occupation Class`, `Medical History Description`, `Phone #`, Address, Username, Password) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
  db.query(
    query,
    [
      firstname,
      lastname,
      middlename,
      ssn,
      age,
      gender,
      race,
      occupation,
      phone,
      address,
      medicalHistory,
      username,
      password,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.send({ err: err });
      }
      console.log("true");
      return res.send(true);
    }
  );
});

app.post("/login", async (req, res) => {
  console.log("authenticating...");
  const { username, password, role } = req.body;
  console.log("info: ", username, password, role);
  let roleQuery = `patient`;
  if (role === "admin") roleQuery = `admin`;
  else if (role === "nurse") roleQuery = `nurse`;
  const query = `SELECT * FROM ${roleQuery} WHERE username = ? AND password = ?`;
  db.query(query, [username, password], (err, result) => {
    if (err) {
      return res.send({ err: err });
    }
    if (result?.length > 0) {
      console.log(true);
      req.session.regenerate(function (err) {
        console.log("regenerating session...");
        if (err) next(err);
        console.log(result[0]);
        // store user information in session, typically a user id
        req.session.user = username;
        req.session.role = role;
        if (role === "patient") req.session.iduser = result[0].idpatient;
        else if (role === "admin") req.session.iduser = result[0].idadmin;
        else if (role === "nurse") req.session.iduser = result[0].idnurse;

        // save the session before redirection to ensure page
        // load does not happen before session is saved
        req.session.save(function (err) {
          console.log("saving session...");
          if (err) return next(err);
          return res.send({
            loggedIn: true,
            username: username,
            role: role,
            iduser: req.session.id,
          });
        });
      });
    } else {
      console.log(false);
      return res.send({ loggedIn: false });
    }
  });
});

app.post("/appointment", isPatient, async (req, res) => {
  console.log("making appointment...");
  const { time, vaccine_id } = req.body;
  console.log(time);

  try {
    // Check if time is available
    const result1 = await queryAsync(
      `SELECT * FROM timeslot WHERE dateinfo = ?`,
      [time]
    );

    if (result1?.length > 0) {
      const { idtimeslot, numOfPeople, numOfNurse } = result1[0];

      if (numOfPeople < numOfNurse * 10 && numOfPeople < 100) {
        console.log(true);

        // Update time slot
        console.log("Updating timeslot...");
        await queryAsync(
          `UPDATE timeslot SET numOfPeople = numOfPeople + 1 WHERE idtimeslot = ?`,
          [idtimeslot]
        );
        console.log("Finished updating timeslot...");

        // Update vaccine
        console.log("Updating vaccine...");
        await queryAsync(
          `UPDATE vaccine SET availableDose = availableDose - 1, numDoseOnHold = numDoseOnHold + 1 WHERE idVaccine = ?`,
          [vaccine_id]
        );
        console.log("Finished updating vaccine...");

        // Check if there is any nurse available at that timeslot
        console.log("nurse available?");
        const result4 = await queryAsync(
          `SELECT idassignedTo FROM assignedto WHERE timeslot_id = ? AND numOfPatients < 10`,
          [idtimeslot]
        );

        if (result4?.length > 0) {
          console.log("Nurse available");
          console.log(result4);
          const { idassignedTo } = result4[0];
          // Update assignment
          console.log("Updating assignment...");
          await queryAsync(
            `UPDATE assignedto SET numOfPatients = numOfPatients + 1 WHERE idassignedTo = ?`,
            [idassignedTo]
          );
          console.log("Finished updating assignment...");

          // update patient
          console.log("Updating patient...");
          await queryAsync(
            `UPDATE patient SET dose = dose + 1, vaccine_id = ? WHERE idpatient = ?`,
            [vaccine_id, req.session.iduser]
          );
          console.log("Finished updating patient...");

          // getting updated patient info
          const { dose } = await getPatientInfo(req.session.iduser);
          console.log("updated dose: ", dose);

          // create new appoiment
          console.log("Creating new appointment...");
          await queryAsync(
            `INSERT INTO appointment (patient_id, assignedto_id, vaccine_id, dose) VALUES (?, ?, ?, ?)`,
            [req.session.iduser, idassignedTo, vaccine_id, dose]
          );
          console.log("Finished creating new appointment...");

          // complete creating new appointment
          return res.send(true);
        } else {
          console.log("The time slot is full");
          return res.send(false);
        }
      } else {
        console.log("No time slot");
        return res.send(false);
      }
    }
  } catch (err) {
    console.error("Error:", err);
    return res.send({ err: err });
  }
});

// Helper function to promisify the database query
function queryAsync(sql, values) {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

app.get("/appointment/:date", async (req, res) => {
  const date = req.params.date;
  const query = `SELECT * FROM timeslot WHERE dateinfo LIKE '${date}%'`;
  db.query(query, (err, result) => {
    if (err) {
      return res.send({ err: err });
    }
    // process availabilities
    const availabilities = [];
    if (!result.length) return res.send([]);
    for (let i = 0; i < result.length; i++) {
      const { idtimeslot, numOfPeople, numOfNurse, dateinfo } = result[i];
      const time = dateinfo.split(" ")[1];
      if (numOfPeople < numOfNurse * 10 && numOfPeople < 100) {
        availabilities.push(time);
      }
    }

    return res.send(availabilities);
  });
});

app.get("/profile/nurse", async (req, res) => {
  const id = req.session.iduser;
  console.log();
  const query = `SELECT * FROM nurse WHERE idnurse = ?`;
  db.query(query, [id], (err, result) => {
    if (err) {
      return res.send({ err: err });
    }
    console.log(result[0]);
    return res.send(result[0]);
  });
});

app.put("/profile/nurse", async (req, res) => {
  console.log("updating profile...");
  const id = req.session.iduser;
  const { "Phone #": phone, Address } = req.body;
  console.log(phone, Address);
  const query = `UPDATE nurse SET \`Phone #\` = ?, Address = ? WHERE idnurse = ?`;
  db.query(query, [phone, Address, id], (err, result) => {
    if (err) {
      return res.send({ err: err });
    }
    console.log("true");
    return res.send(true);
  });
});

app.get("/profile/patient", async (req, res) => {
  console.log("getting patient profile...");
  const id = req.session.iduser;
  const result = await getPatientInfo(id);
  console.log(result);
  return res.send(result);
});

const getPatientInfo = async (id) => {
  const query = `SELECT * FROM patient WHERE idpatient = ?`;
  const result = await queryAsync(query, [id]);
  return result[0];
};

app.put("/profile/patient", async (req, res) => {
  console.log("updating patient profile...");
  const id = req.session.iduser;
  const {
    Fname,
    MI,
    Lname,
    Age,
    Address,
    Gender,
    "Medical History Description": MedicalHistory,
    "Phone #": Phone,
    Race,
    SSN,
    Username,
  } = req.body;
  const query = `UPDATE patient SET Fname=?, MI=?, Lname=?, Age=?, Address=?, Gender=?, \`Medical History Description\`=?, \`Phone #\`=?, Race=?, SSN=?, Username=? WHERE idpatient = ?`;
  db.query(
    query,
    [
      Fname,
      MI,
      Lname,
      Age,
      Address,
      Gender,
      MedicalHistory,
      Phone,
      Race,
      SSN,
      Username,
      id,
    ],
    (err, result) => {
      if (err) {
        return res.send({ err: err });
      }
      console.log("true");
      return res.send(true);
    }
  );
});

app.get("/admin/search/:option", isAdmin, async (req, res) => {
  console.log("searching...");
  const option = req.params.option;
  console.log(option);
  const query = `SELECT * FROM ${option}`;
  db.query(query, (err, result) => {
    if (err) {
      return res.send({ err: err });
    }
    console.log(result);
    return res.send(result);
  });
});

app.delete("/admin/delete/:option/:id", isAdmin, async (req, res) => {
  console.log("deleting...");
  const option = req.params.option;
  const id = req.params.id;
  console.log(option, id);
  let query;
  if (option === "patient") {
    query = `DELETE FROM ${option} WHERE idpatient = ?`;
  } else if (option === "nurse") {
    query = `DELETE FROM ${option} WHERE idnurse = ?`;
  }
  db.query(query, [id], (err, result) => {
    if (err) {
      return res.send({ err: err });
    }
    console.log("true");
    return res.send(true);
  });
});

// only getting the available vaccine
app.get("/vaccine", async (req, res) => {
  console.log("getting vaccine...");
  const query = `SELECT * FROM vaccine`;
  db.query(query, (err, result) => {
    if (err) {
      return res.send({ err: err });
    }
    const vaccineStillAvailable = [];
    for (let i = 0; i < result.length; i++) {
      const { availabeDose } = result[i];
      if (availabeDose > 0) {
        vaccineStillAvailable.push(result[i]);
      }
    }
    console.log(result);
    return res.send(result);
  });
});

app.get("/logout", async (req, res) => {
  console.log("logging out...");
  req.session.destroy(function (err) {
    if (err) return next(err);
    return res.send({ loggedIn: false });
  });
});

app.listen(3600, () => {
  console.log("Server listening on port 3600");
});
