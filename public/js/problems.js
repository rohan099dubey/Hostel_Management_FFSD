import { cloudinary } from "../config/cloudinary.js";

document
    .getElementById("problemForm")
    .addEventListener("submit", async function (event) {
        event.preventDefault();

        // Get form values
        const form = event.target;
        const problemTitle = form.problemTitle.value.trim();
        const problemDescription = form.problemDescription.value.trim();
        const problemImage = form.problemImage.files[0];
        const roomNo = form.roomNo.value.trim();
        const category = form.category.value;
        const studentId = form.roll_number.value.trim();
        const hostel = form.hostel.value;

        console.log("Form Data:", {
            problemTitle,
            problemDescription,
            problemImage,
            roomNo,
            category,
            studentId,
            hostel,
        });

        // Check if all fields are filled
        if (
            !problemTitle ||
            !problemDescription ||
            !problemImage ||
            !roomNo ||
            !category ||
            !studentId ||
            !hostel
        ) {
            return alert("All fields are required.");
        }

        try {
            // Upload image to Cloudinary
            const formData = new FormData();
            formData.append("file", problemImage);
            formData.append("upload_preset", "hostelia");

            const cloudinaryRes = await fetch(
                "https://api.cloudinary.com/v1_1/dyzoysf4v/image/upload",
                { method: "POST", body: formData }
            );
            const cloudinaryData = await cloudinaryRes.json();

            console.log("Cloudinary Response:", cloudinaryData);

            if (!cloudinaryData.secure_url)
                return alert("Image upload failed.");

            // Send problem data to backend
            const response = await fetch("/services/problems/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    problemTitle,
                    problemDescription,
                    problemImage: cloudinaryData.secure_url,
                    roomNo: Number(roomNo),
                    category,
                    studentId,
                    hostel,
                }),
            });

            console.log("Server Response:", response);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error adding problem:", errorData);
                return alert("Error adding problem: " + errorData.message);
            }

            alert("Problem added successfully!");
            form.reset();
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred.");
        }
    });