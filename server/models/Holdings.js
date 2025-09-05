import mongoose from "mongoose";

const HoldingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    stock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    buyPrice: {
        type: Number,
        required: true,
    },
}); 

const Holdings = mongoose.model("Holdings", HoldingsSchema);

export default Holdings;