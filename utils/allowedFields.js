exports.allowedFields=(req,...vars)=>{
  const updates = Object.keys(req.body)
  const allowedUpdates = [...vars]
  return updates.every((update) => allowedUpdates.includes(update))

}