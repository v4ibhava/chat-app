import jwt from "jsonwebtoken"
export const generateToken = (userId, res) => {
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn:"7d"})
    
    const isProduction = process.env.NODE_ENV === "production" || (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith("https"));
    res.cookie("jwt",token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // MS
        httpOnly: true, // prevent xss attacks cross-site scripting attacks
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction
    })
    return token;
}