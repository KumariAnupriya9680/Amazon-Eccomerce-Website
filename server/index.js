const express=require("express")
const app=express();
const cors=require("cors");
const morgan=require("morgan");
const {OrderModel}=require("./OderModel")
const exp = require("constants");
const mongoose=require("mongoose");
const connectDB=require("./db_config")
const crypto=require("crypto");
const Razorpay=require("razorpay")
const razorpay = new Razorpay({
    key_id: 'rzp_test_aoJUXfCNkvv4gH',
    key_secret: 'PZlW2Gdi8ZRSqR8NFtY7SDqb',
  });
connectDB()


// middleware
app.use(cors())
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({extended:false}))

// routes
app.post('/payment/checkout', async (req, res) => {
  const { name, amount } = req.body;

try {
  const order = await razorpay.orders.create({
    amount: Number(amount) * 100, // amount in the smallest currency unit
    currency: 'INR',
  });

  await OrderModel.create({
    order_id: order.id,
    name: name,
    amount: amount,
  });

  console.log({ order });
  res.json({ order });
} catch (error) {
  console.error('Error during checkout:', error.stack);
  res.status(500).json({ error: 'Payment failed', details: error.message });
}
});
app.post('/payment/payment-verification', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  // Construct the expected signature
  const body_data = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto.createHmac('sha256', 'PZlW2Gdi8ZRSqR8NFtY7SDqb')
    .update(body_data)
    .digest("hex");

  // Verify the signature
  const isValid = expectedSignature === razorpay_signature;

  if (isValid) {
    try {
      // Update the order with the payment details
      await OrderModel.findOneAndUpdate(
        { order_id: razorpay_order_id },
        {
          $set: {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
          }
        },
        { new: true } // Option to return the updated document
      );

      // Redirect to the success page
      res.redirect(`http://localhost:3000/sucess`);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    // Redirect to the failed page
    res.redirect("http://localhost:3000/failed");
  }
});

app.get("/",(req,res)=>{
    res.send("server is running");
})
app.listen(5000,()=>{
    console.log(`the app is listen at http://localhost:5000`);
})