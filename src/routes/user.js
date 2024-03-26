const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
const bcrypt = require('bcrypt')


const route = Router();

route.get("/allUser",async (req,res)=>{ //ดูผู้ใช้ทั้งหมด
  
  if(req.user.role!=="ADMIN"){
    return res.send({error:"You are not allowed to"})
  }
  try {
    const user = await prisma.user.findMany()
    if (!user) {
      return res.status(404).send({
        error: "user not found",
      });
  }
  console.log(user);
  return  res.send(user)
  } catch (error) {
    console.log(error);
    return res.send(error)
  }

});

route.get("/", async (req, res) => { //ดูโปรไฟล์
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).send({
        error: "user not found",
      });
    }

    return res.send(user);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.patch("/information", async (req, res) => {//แก้ไขข้อมูล
  const schema = Joi.object({
    name: Joi.string().required(),
    username: Joi.string().required(),
    email : Joi.string().required(),
    tel: Joi.string().required(),
  })
  const {error, value} = schema.validate(req.body);
  if(error){
    console.log(error);
    return res.status(400).send({error:"Invalid body"})
  }
  try {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
  });
  console.log(value);
  const checkusername = await prisma.user.findFirst({
    where: {
      username: value.username,
      NOT: {
        id: req.user.id
      }
        
    }
});

const checkemail = await prisma.user.findFirst({
  where: {
    email: value.email,
    NOT: {
      id: req.user.id
    }
  }
});

const checktel = await prisma.user.findFirst({
  where: {
    tel: value.tel,
    NOT: {
      id: req.user.id
    }
  }
});

  if(checkusername){
    console.log(checkusername);
    return res.send({error:"There is duplicate username"})
  }

  if(checkemail){
    console.log(checkemail);
    return res.send({error:"There is duplicate email"})
  }
  if(checktel){
    console.log(checktel);
    return res.send({error:"There is duplicate phone"})
  }

  if (!user) {
    return res.status(404).send({
      error: "user not found",
    });
  }

    const updated = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: value,
    });

    return res.send(updated);
  } catch (e) {
    console.log(e);
    return res.send({e});
  }
});

route.patch('/password',async (req, res) => { //เปลี่ยนรหัสผ่าน
  const schema = Joi.object({
    password: Joi.string().required(),
    newpassword: Joi.string().required(),
    Confirmpassword: Joi.string().required(),
  }).required();
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).send({
      error: "Invalid body",
    });
  }

  const user = await prisma.user.findFirst({
    where:{
      id: req.user.id
    }
  })
  
  try {
    if(bcrypt.compareSync(value.password,user.password)){
      if(value.newpassword===value.Confirmpassword){
        const passwordhash = await bcrypt.hash(value.newpassword, 10);
        const change = await prisma.user.update({
          where: { id: req.user.id },
          data: {password : passwordhash },
        })
        console.log(change)
        return res.send({change})
      }
      else{
        return res.send({error: "The new password doesn't match."})
      }
    }
    else{
      return res.send({error: "Wrong  password"})
    }
  } catch (e) { 
    if (e instanceof Prisma.PrismaClientKnownRequestError) {//ให้รู้ว่าเป็นerrorของprisma
      if (e.meta.target) {
        return res.status(400).send({
          error: "Duplicate field",
          target: e.meta.target.split("_")[1],
        });
      }
    }
    console.log(e);
    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
  
})

route.delete("/", async (req, res) => { //ลบโปรไฟล์
  if(req.user.role!=="ADMIN"){
    return res.send({error:"You are not allowed to"})
  }
  
  const schema = Joi.object({
    id: Joi.number().required(),
  }).required();
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).send({
      error: "Invalid id",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: value.id,
      },
    });

    if (!user) {
      return res.status(404).send({
        error: "user not found",
      });
    }

    const removed = await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    return res.send(removed);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./uploads/users");
  },
});


const upload = multer({ storage, limits: { fileSize: 1000000 } });

route.post("/photo", upload.single("photo"), async (req, res) => {//เพิ่มรูปโปรไฟล์ ต้องใส่keyเป็นphoto นะ
  const user = await prisma.user.findUnique({
    where:{
      id: req.user.id,
    }
  })
  console.log(user.profile);
  try {
    if(req.file && user.profile){
    console.log(__dirname, "../../"+user.profile);
    await unlinkAsync(path.join(__dirname, "../../"+user.profile))
  }
  
  const updated = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      profile: req.file.path,
    },
  });
  console.log(updated);
  res.send(req.file);
  } catch (error) {
    console.log(error);
    return res.send(error)
  }
});

route.get("/profileUser", async (req, res) => {
  res.setHeader("Content-Type", "image/jpeg");
  const image = await prisma.user.findUnique({
    where: {id: req.user.id}
  })
  console.log(image.profile);
  res.sendFile(path.join(__dirname, "../../"+image.profile));
});

route.post("/report", async (req, res) => {//ส่งปัญหา
  const schema = Joi.object({
    problemType: Joi.string().required(),
    details: Joi.string().required(),
    comment: Joi.string().required()
  })
  const {error,value} = schema.validate(req.body)
  
  if(error){
    console.log(error);
    return res.status(400).send({error:"Invalid body"})
  }
  try {
    const report = await prisma.report.create({
      data:{
        ...value,
        userId: req.user.id,
      }
    })
    return res.send(report);

  } catch (error) {
    console.log(error);
    return res.send(error);
  }
})

route.get("/report",async (req,res) =>{//ดูที่ปัญหา
  if(req.user.role!=="ADMIN"){
    return res.send({error:"You are not allowed to"})
  }

  try {
    const report = await prisma.report.findMany({
      where:{update: false,} 
    })
    if (!report) {
      return res.status(404).send({
        error: "user not found",
      });
  }
  console.log(report);
  return  res.send(report)
  } catch (report) {
    console.log(report);
    return res.send(report)
  }
})

route.patch("/update",async (req, res) => { //admin แก้ไขแล้ว
  if(req.user.role!=="ADMIN"){
    return res.send({error:"You are not allowed to"})
  }

  const schema = Joi.object({
    reportId: Joi.number().required(),
  }).required();
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).send({ error: "Invalid body" });
  }
  try {
    const report = await prisma.report.update({
      where: {
        id: value.reportId,
      },
      data:{
        update:true
      }
    });

    return res.send(report);
  } catch (report) {
    console.log(error);
    return res.send(error);
  }

})

module.exports = route;
