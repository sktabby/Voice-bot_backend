def education_advisor(prompt: str) -> str:
    """
    Very basic prompt-based education advisor.
    No ML, no API – pure logic for now.
    """

    prompt = prompt.lower().strip()

    # 10th / stream guidance
    if "10" in prompt or "tenth" in prompt or "10th" in prompt:
        return (
            "After 10th, you generally have three main streams:\n\n"
            "1️⃣ Science – If you enjoy Maths, Physics, Computers or Biology.\n"
            "2️⃣ Commerce – If you like business, finance, accounts, economics.\n"
            "3️⃣ Arts – If you are interested in humanities, design, psychology, law.\n\n"
            "👉 Think about your interests and strengths before choosing."
        )

    # Career / computer interest
    if "computer" in prompt or "coding" in prompt or "software" in prompt:
        return (
            "If you are interested in computers, here are some options:\n\n"
            "• Computer Science / IT Engineering\n"
            "• Data Science / AI & ML\n"
            "• Web or App Development\n"
            "• Cybersecurity\n\n"
            "👉 Focus on Maths and logical thinking."
        )

    # Science stream
    if "science" in prompt:
        return (
            "Science stream is a good choice if you enjoy problem-solving.\n\n"
            "You can go into:\n"
            "• Engineering\n"
            "• Medical\n"
            "• Research\n"
            "• Data / AI fields\n\n"
            "👉 Strong foundation in Maths and Science is important."
        )

    # Default fallback
    return (
        "I can help you with education and career guidance.\n\n"
        "Try asking things like:\n"
        "• What should I choose after 10th?\n"
        "• I like computers, what career is good?\n"
        "• Should I take science or commerce?"
    )
