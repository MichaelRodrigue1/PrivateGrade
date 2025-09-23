import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("deploy-private-grade")
  .setDescription("Deploy the PrivateGradeSystem contract")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory("PrivateGradeSystem");
    
    console.log("Deploying PrivateGradeSystem contract...");
    const contract = await contractFactory.connect(signers[0]).deploy();
    await contract.waitForDeployment();
    
    console.log("PrivateGradeSystem deployed to:", await contract.getAddress());
    console.log("Owner:", await signers[0].getAddress());
    
    return contract;
  });

task("authorize-teacher")
  .setDescription("Authorize a teacher to submit scores")
  .addParam("contract", "The deployed contract address")
  .addParam("teacher", "The teacher's address to authorize")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateGradeSystem", taskArguments.contract);
    
    console.log("Authorizing teacher:", taskArguments.teacher);
    const tx = await contract.connect(signers[0]).authorizeTeacher(taskArguments.teacher);
    await tx.wait();
    
    console.log("Teacher authorized successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("submit-score")
  .setDescription("Submit an encrypted score for a student")
  .addParam("contract", "The deployed contract address")
  .addParam("student", "The student's address")
  .addParam("score", "The score to submit (plaintext)")
  .addOptionalParam("teacherIndex", "Index of teacher signer", 1, types.int)
  .setAction(async function (taskArguments: TaskArguments, { ethers, fhevm }) {
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateGradeSystem", taskArguments.contract);
    const teacher = signers[taskArguments.teacherIndex];
    const teacherAddress = await teacher.getAddress();
    await fhevm.initializeCLIApi()
    console.log("Submitting score for student:", taskArguments.student);
    console.log("Score:", taskArguments.score);
    console.log("Teacher:", teacherAddress);
    
    // Create encrypted input
    const input = fhevm.createEncryptedInput(taskArguments.contract, teacherAddress);
    input.add32(parseInt(taskArguments.score));
    const encryptedInput = await input.encrypt();
    
    // Submit score
    const tx = await contract
      .connect(teacher)
      .submitScore(taskArguments.student, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();
    
    console.log("Score submitted successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("get-student-score")
  .setDescription("Get encrypted score for a student (only the student can call this)")
  .addParam("contract", "The deployed contract address")
  .addParam("student", "The student's address")
  .addOptionalParam("studentIndex", "Index of student signer", 2, types.int)
  .setAction(async function (taskArguments: TaskArguments, { ethers, fhevm }) {
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateGradeSystem", taskArguments.contract);
    const student = signers[taskArguments.studentIndex];
    await fhevm.initializeCLIApi();

    console.log("Getting score for student:", taskArguments.student);
    console.log("Using signer:", await student.getAddress());
    
    try {
      const encryptedScore = await contract.connect(student).getStudentScore(taskArguments.student);
      console.log("Encrypted score handle:", encryptedScore);
      
      // Decrypt the score
      const decryptedScore = await fhevm.userDecryptEuint(
        fhevm.FhevmType.euint32,
        encryptedScore,
        taskArguments.contract,
        student
      );
      
      console.log("Decrypted score:", decryptedScore.toString());
    } catch (error) {
      console.error("Error getting score:", error);
    }
  });

task("check-admission-threshold")
  .setDescription("Check if a student meets admission threshold")
  .addParam("contract", "The deployed contract address")
  .addParam("student", "The student's address")
  .addParam("threshold", "The admission threshold")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateGradeSystem", taskArguments.contract);
    
    console.log("Checking admission threshold for student:", taskArguments.student);
    console.log("Threshold:", taskArguments.threshold);
    
    try {
      const meetsThreshold = await contract.meetsAdmissionThreshold(
        taskArguments.student,
        parseInt(taskArguments.threshold)
      );
      
      console.log("Encrypted result handle:", meetsThreshold);
      console.log("The school can use this encrypted boolean to determine admission without seeing the actual score.");
    } catch (error) {
      console.error("Error checking threshold:", error);
    }
  });

task("batch-check-threshold")
  .setDescription("Batch check if students meet admission threshold")
  .addParam("contract", "The deployed contract address")
  .addParam("students", "Comma-separated list of student addresses")
  .addParam("threshold", "The admission threshold")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateGradeSystem", taskArguments.contract);
    
    const studentAddresses = taskArguments.students.split(',').map((addr: string) => addr.trim());
    
    console.log("Batch checking admission threshold for students:", studentAddresses);
    console.log("Threshold:", taskArguments.threshold);
    
    try {
      const results = await contract.batchCheckAdmissionThreshold(
        studentAddresses,
        parseInt(taskArguments.threshold)
      );
      
      console.log("Encrypted results:");
      results.forEach((result: any, index: number) => {
        console.log(`Student ${studentAddresses[index]}: ${result}`);
      });
      
      console.log("Schools can use these encrypted booleans for admission decisions without seeing actual scores.");
    } catch (error) {
      console.error("Error in batch check:", error);
    }
  });

task("check-student-has-score")
  .setDescription("Check if a student has a score recorded")
  .addParam("contract", "The deployed contract address")
  .addParam("student", "The student's address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateGradeSystem", taskArguments.contract);
    
    console.log("Checking if student has score:", taskArguments.student);
    
    const hasScore = await contract.studentHasScore(taskArguments.student);
    console.log("Has score:", hasScore);
  });

task("list-contract-info")
  .setDescription("List basic contract information")
  .addParam("contract", "The deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateGradeSystem", taskArguments.contract);
    
    console.log("Contract address:", taskArguments.contract);
    console.log("Owner:", await contract.owner());
    
    // Check authorization status for first few signers
    for (let i = 0; i < Math.min(5, signers.length); i++) {
      const address = await signers[i].getAddress();
      const isAuthorized = await contract.authorizedTeachers(address);
      console.log(`Signer ${i} (${address}): ${isAuthorized ? 'Authorized Teacher' : 'Not Authorized'}`);
    }
  });

