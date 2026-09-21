from setuptools import setup, find_packages

setup(
    name="multiplicity-crypto-py",
    version="1.0.0",
    packages=find_packages(where="."),
    python_requires=">=3.9",
    install_requires=[
        "numpy",
        "sympy",
    ],
    extras_require={
        "test": ["pytest"],
    },
    description="Simulated classical hybrid encryption with prime-indexed tags v1.0.1 — Python interop bridge",
)
