const { prisma } = require("../src/lib/prisma");

(async () => {
  await prisma.bill.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.game.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();

  await prisma.bill.createMany({
    data: [],
  });

  await prisma.cart.createMany({
    data: [],
  });

  await prisma.favorite.createMany({
    data: [],
  });

  await prisma.game.createMany({
    data: [],
  });

  await prisma.order.createMany({
    data: [],
  });

  await prisma.user.createMany({
    data: [],
  });
})();
