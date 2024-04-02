const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");

const route = Router();//require ฟังก์ชั่นทั้งหมดที่ต้องใช้

route.get("/", async (req, res) => { //ดูเกมที่กดชอบไว้
    try {
      //ค้นหาเกมที่ชอบผ่านId
      const favorite = await prisma.favorite.findMany({
        where: { userId: req.user.id },
      });
      return res.send(favorite);//ส่งข้อมูลเมที่ชอบทั้งหมดกลับไป
    } catch (e) {//ถ้ามีerrorให้ส่งerrorกลับไป
      console.log(e);
      return res.status(500).send({
        error: "Internal Service Error",
      });
    }
  });

route.post("/", async (req, res) => {//เพิ่มเกมที่ชอบ
  const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
    gameId: Joi.number().required(),
  })
  const {error,value} = schema.validate(req.body)

  if(error){//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({error: "Invalid body"});
  }
  //ดูว่ามีเกมที่จะชอบมีอยู่แล้วหรือไม่
  const check = await prisma.favorite.findFirst({
    where:{userId:req.user.id,
    gameId:value.gameId}
  })
  console.log(req.user.id);
  if(check){//ถ้ามีเกมที่จะชอบมีอยู่แล้วให้ส่งกลับไปเป็นfalse
    return res.send({error: false})
  }
  try {//เพิ่มเกมที่ชอบลงfavorite
    const favorite = await prisma.favorite.create({
        data:{ 
            gameId: value.gameId,
            userId: req.user.id,
        }
    })
    console.log(favorite);
    return res.send(favorite);//ส่งข้มมูลเกมที่favoriteกลับไป
  } catch (error) {//ถ้ามี error ให้แสง error
    console.log(e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.meta.target) {
        return res.status(400).send({
          error: "Duplicate field",
          target: e.meta.target.split("_")[1],
        });
      }
    }

    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

route.delete("/", async (req, res) => {//ลบเกมที่ชอบ
    const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
        gameId: Joi.number().required(),
      }).required();
      const { error, value } = schema.validate(req.body);
      
      if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
        return res.status(400).send({ error: "Invalid body" });
      }
      try { //ลบเกมจากId favoriteที่รับมาของuser
        const favorite = await prisma.favorite.deleteMany({
          where: {
            userId: req.user.id,
            gameId: value.gameId,
          },
        });
        console.log(favorite);
        return res.send(favorite);//ส่งข้อมูลfavoriteกลับไป
      } catch (error) {//ถ้ามี error ให้แสดง error
        if (error instanceof Prisma.PrismaClientInitializationError) {
          if (error.mata.target) {
            return res.status(400).send({
              error: "Duplicate field",
              target: e.meta.target.split("_")[1],
            });
          }
        }
        console.log(error);
        return res.status(500).send({ error: "Internal Server Error" });
      }
});




module.exports = route;
