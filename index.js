const { Telegraf, Markup } = require("telegraf");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB)
  .then(() => console.log("connect to db"))
  .catch((e) => console.log(e));

const token = process.env.TOKEN;
const bot = new Telegraf(token);
const channel = process.env.CHANNEL;

const UserSchema = new mongoose.Schema({
  tgId: String,
  is_bot: Boolean,
  first_name: String,
  username: String,
  language_code: String,
  is_premium: Boolean,
});

const User = mongoose.model("user", UserSchema);

bot.help((ctx) => {
  ctx.reply(`
    /users - obuna bolgan userlarni chiqaradi
/products - hamma tovarlarni chiqaradi
    
    /create
    tovarning nomi
    narxi
    miqdori
    
    /update
    tovar idsi
    tovarning nomi
    narxi
    miqdori

    /delete
    tovar idsi
    `)
});

bot.use(async (ctx, next) => {
  let userId = ctx.from.id;
  let member = await ctx.telegram.getChatMember(channel, userId);

  if (member.status == "kicked" || member.status == "left") {
    ctx.reply(
      "join our chanel",
      Markup.inlineKeyboard([
        Markup.button.url(
          "join our chanel",
          `https://t.me/${channel.slice(1)}`
        ),
      ])
    );
  } else {
    next();
  }
});

bot.start(async (ctx) => {
  const { id, ...rest } = ctx.from;
  let user = await User.findOne({ tgId: id });
  if (!user) {
    const newUser = new User({ tgId: id, ...rest });
    await newUser.save();
    ctx.reply("Assalomu alaykum Xush kelibsiz");
  } else {
    ctx.reply(
      `Assalomu alaykum sizni yana ko'rganimzidan xursandmiz ${rest.first_name}`
    );
  }
});

bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim().toLowerCase();

  try {
    const { data } = await axios.get(
      "https://tgbotcha.onrender.com"
    );

    const filtered = data.filter((p) => p.name.toLowerCase().includes(query));

    const result = filtered.map((f) => {
      return {
        type: "article",
        id: f._id.toString(),
        title: f.name,
        input_message_content: {
          message_text: `${f.name} - $${f.price}\nIn stock: ${f.count}`,
        },
      };
    });

    await ctx.answerInlineQuery(result, { cache_time: 0 });
  } catch (e) {
    console.log(e);
  }
});

bot.command("users", async (ctx) => {
  const data = await User.find();

  for (const user of data) {
    ctx.reply(
      `Name: ${user.first_name}\nid: ${user.tgId}\nUsername: ${user.username}`
    );
  }
});

bot.command("create", async (ctx) => {
  let tovar = ctx.message.text;
  try {
    let parts = tovar.split("\n");
    let name = parts[1].trim();
    let price = parts[2].trim();
    let count = parts[3].trim();

    if (name && price && count) {
      if (isNaN(+price) || isNaN(+count)) {
        throw new Error("price or count isNaN");
      }
    } else {
      throw new Error("name or price or count is undefined");
    }

    let updProd = await axios.post(
      "https://tgbotcha.onrender.com",
      {
        name,
        price,
        count,
      }
    );

    if (updProd.status == 201) {
      ctx.reply("Product yaratildi!");
    } else {
      ctx.reply("Xatolik, iltimos keenroq urinib ko'ring");
    }
  } catch (e) {
    ctx.reply("Yangi tovar notog'ri formatda berilgan!!! Qayna urinib ko'ring");
  }
});

bot.command("update", async (ctx) => {
  let tovar = ctx.message.text;
  try {
    let parts = tovar.split("\n");
    let id = parts[1].trim();
    let name = parts[2].trim();
    let price = parts[3].trim();
    let count = parts[4].trim();

    if (id.length < 23) {
      throw new Error("bu id mavjud emas");
    }

    if (name && price && count) {
      if (isNaN(+price) || isNaN(+count)) {
        throw new Error("price or count isNaN");
      }
    } else {
      throw new Error("name or price or count is undefined");
    }

    let updProd = await axios.patch(
      `https://tgbotcha.onrender.com/products/${id}`,
      {
        name,
        price,
        count,
      }
    );

    if (updProd.status == 200) {
      ctx.reply("Product o'zgartirildi!");
    } else {
      ctx.reply("iltimos mavjud bolgan idni yozing");
    }
  } catch (e) {
    ctx.reply(
      "notog'ri formatda berilgan!!! Qayna urinib ko'ring"
    );
  }
});

bot.command("delete", async (ctx) => {
  let tovar = ctx.message.text;
  try {
    let parts = tovar.split("\n");
    let id = parts[1].trim();

    if (id.length < 23) {
      throw new Error("bu id mavjud emas");
    }

    let delPrd = await axios.delete(
      `https://tgbotcha.onrender.com/products/${id}`
    );

    if (delPrd.status == 200) {
      ctx.reply(`${delPrd.data.name} o'chirildi!`);
    } else {
      ctx.reply("iltimos mavjud bolgan idni yozing");
    }
  } catch (e) {
    ctx.reply(
      "id notog'ri formatda berilgan!!! Qayna urinib ko'ring"
    );
  }
});

bot.command("products", async (ctx) => {
  const { data } = await axios.get(
    "https://tgbotcha.onrender.com/products"
  );
  for (const prod of data) {
    ctx.reply(`${prod.name}\nid: ${prod._id}`);
  }
});

bot.launch();
