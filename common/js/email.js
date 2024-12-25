const nodemailer=require('nodemailer');

let transporter=nodemailer.createTransport({

    service:'qq',

    auth: {

        user:'506782828@qq.com',

        //QQ邮箱 -> 设置 -> 帐户 -> 开启服务：POP3/SMTP服务 会收到验证码

        pass:'xxxxxxxxxxxxxx'//授权码,通过QQ获取

    }

});

let mailOptions={

    from:'506782828@qq.com',// 发件人地址

    to:'506782828@qq.com',// 收件人地址  自己发自己进行测试

    subject:'标题',// 标题

    //text和html两者只支持一种

    text:'Hello world !',// 标题

    html:'<h1>Hello world !</h1>'// html 内容

};

let sendMail = (mailOptions,cb)=>{

    transporter.sendMail(mailOptions,cb);

};

sendMail(mailOptions,(error,info)=>{

    if(error){

        console.log(error);

    }

    console.log("发送邮件成功",info);

});
