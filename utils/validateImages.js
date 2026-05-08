function validateImages(files = []) {
  const errors = [];

  if (files.length === 0) {
    errors.push("Images are required");
    return errors;
  }

  if (files.length > 10) {
    errors.push("Maximum 10 images allowed");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  const hasInvalidType = files.some(
    (file) => !allowedTypes.includes(file.mimetype),
  );

  if (hasInvalidType) {
    errors.push("Only JPG, PNG, WEBP images allowed");
  }

  const hasTooLarge = files.some((file) => file.size > 2 * 1024 * 1024);

  if (hasTooLarge) {
    errors.push("Each image must be under 2MB");
  }

  return errors;
}

export default validateImages;
