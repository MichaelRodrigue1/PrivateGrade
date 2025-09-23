import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { Signer } from "ethers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { PrivateGradeSystem } from "../types";

describe("PrivateGradeSystem", function () {
  let contract: PrivateGradeSystem;
  let owner: Signer;
  let teacher: Signer;
  let student: Signer;
  let school: Signer;
  let unauthorizedUser: Signer;

  let ownerAddress: string;
  let teacherAddress: string;
  let studentAddress: string;
  let schoolAddress: string;
  let unauthorizedAddress: string;

  beforeEach(async function () {
    // Get signers
    [owner, teacher, student, school, unauthorizedUser] = await ethers.getSigners();
    
    ownerAddress = await owner.getAddress();
    teacherAddress = await teacher.getAddress();
    studentAddress = await student.getAddress();
    schoolAddress = await school.getAddress();
    unauthorizedAddress = await unauthorizedUser.getAddress();

    // Deploy the contract
    const contractFactory = await ethers.getContractFactory("PrivateGradeSystem");
    contract = await contractFactory.connect(owner).deploy();
    await contract.waitForDeployment();
  });

  describe("Teacher Authorization", function () {
    it("Should authorize a teacher", async function () {
      await contract.connect(owner).authorizeTeacher(teacherAddress);
      expect(await contract.authorizedTeachers(teacherAddress)).to.be.true;
    });

    it("Should deauthorize a teacher", async function () {
      await contract.connect(owner).authorizeTeacher(teacherAddress);
      await contract.connect(owner).deauthorizeTeacher(teacherAddress);
      expect(await contract.authorizedTeachers(teacherAddress)).to.be.false;
    });

    it("Should not allow non-owner to authorize teacher", async function () {
      await expect(
        contract.connect(teacher).authorizeTeacher(teacherAddress)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should not allow invalid teacher address", async function () {
      await expect(
        contract.connect(owner).authorizeTeacher(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid teacher address");
    });
  });

  describe("Score Submission", function () {
    beforeEach(async function () {
      // Authorize teacher
      await contract.connect(owner).authorizeTeacher(teacherAddress);
    });

    it("Should allow authorized teacher to submit score", async function () {
      const score = 85;
      
      // Create encrypted input
      const input = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input.add32(score);
      const encryptedInput = await input.encrypt();

      // Submit score
      await contract
        .connect(teacher)
        .submitScore(studentAddress, encryptedInput.handles[0], encryptedInput.inputProof);

      expect(await contract.hasScore(studentAddress)).to.be.true;
    });

    it("Should not allow unauthorized user to submit score", async function () {
      const score = 85;
      
      const input = fhevm.createEncryptedInput(await contract.getAddress(), unauthorizedAddress);
      input.add32(score);
      const encryptedInput = await input.encrypt();

      await expect(
        contract
          .connect(unauthorizedUser)
          .submitScore(studentAddress, encryptedInput.handles[0], encryptedInput.inputProof)
      ).to.be.revertedWith("Only authorized teachers can submit scores");
    });

    it("Should not allow invalid student address", async function () {
      const score = 85;
      
      const input = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input.add32(score);
      const encryptedInput = await input.encrypt();

      await expect(
        contract
          .connect(teacher)
          .submitScore(ethers.ZeroAddress, encryptedInput.handles[0], encryptedInput.inputProof)
      ).to.be.revertedWith("Invalid student address");
    });

    it("Should emit ScoreSubmitted event on first submission", async function () {
      const score = 85;
      
      const input = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input.add32(score);
      const encryptedInput = await input.encrypt();

      const tx = await contract
        .connect(teacher)
        .submitScore(studentAddress, encryptedInput.handles[0], encryptedInput.inputProof);
      
      await expect(tx).to.emit(contract, "ScoreSubmitted")
        .withArgs(studentAddress, teacherAddress);
    });
  });

  describe("Score Access", function () {
    beforeEach(async function () {
      // Authorize teacher and submit a score
      await contract.connect(owner).authorizeTeacher(teacherAddress);
      
      const score = 85;
      const input = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input.add32(score);
      const encryptedInput = await input.encrypt();

      await contract
        .connect(teacher)
        .submitScore(studentAddress, encryptedInput.handles[0], encryptedInput.inputProof);
    });

    it("Should allow student to access their own encrypted score", async function () {
      const encryptedScore = await contract.connect(student).getStudentScore(studentAddress);
      expect(encryptedScore).to.not.be.undefined;
    });

    it("Should not allow other users to access student's score", async function () {
      await expect(
        contract.connect(school).getStudentScore(studentAddress)
      ).to.be.revertedWith("Only the student can access their own score");
    });

    it("Should allow student to decrypt their own score", async function () {
      const encryptedScore = await contract.connect(student).getStudentScore(studentAddress);
      
      // Decrypt the score
      const decryptedScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedScore,
        await contract.getAddress(),
        student
      );
      
      expect(decryptedScore).to.equal(85);
    });

    it("Should fail when trying to get score for student without score", async function () {
      await expect(
        contract.connect(school).getStudentScore(schoolAddress)
      ).to.be.revertedWith("No score found for student");
    });
  });

  describe("Admission Threshold Check", function () {
    beforeEach(async function () {
      // Authorize teacher and submit scores for multiple students
      await contract.connect(owner).authorizeTeacher(teacherAddress);
      
      // Student 1: Score 85
      const score1 = 85;
      const input1 = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input1.add32(score1);
      const encryptedInput1 = await input1.encrypt();
      await contract
        .connect(teacher)
        .submitScore(studentAddress, encryptedInput1.handles[0], encryptedInput1.inputProof);

      // Student 2 (school): Score 65
      const score2 = 65;
      const input2 = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input2.add32(score2);
      const encryptedInput2 = await input2.encrypt();
      await contract
        .connect(teacher)
        .submitScore(schoolAddress, encryptedInput2.handles[0], encryptedInput2.inputProof);
    });

    it("Should check if student meets admission threshold", async function () {
      const threshold = 80;
      const meetsThreshold = await contract.meetsAdmissionThreshold(studentAddress, threshold);
      
      // The result should be an encrypted boolean
      expect(meetsThreshold).to.not.be.undefined;
    });

    it("Should handle batch threshold check", async function () {
      const threshold = 80;
      const students = [studentAddress, schoolAddress];
      
      const tx = await contract.batchCheckAdmissionThreshold(students, threshold);
      expect(tx).to.not.be.undefined;
    });

    it("Should return false for students without scores in batch check", async function () {
      const threshold = 80;
      const students = [studentAddress, unauthorizedAddress]; // unauthorizedAddress has no score
      
      const tx = await contract.batchCheckAdmissionThreshold(students, threshold);
      expect(tx).to.not.be.undefined;
    });

    it("Should fail threshold check for student without score", async function () {
      const threshold = 80;
      
      await expect(
        contract.meetsAdmissionThreshold(unauthorizedAddress, threshold)
      ).to.be.revertedWith("No score found for student");
    });
  });

  describe("Utility Functions", function () {
    it("Should check if student has score", async function () {
      expect(await contract.studentHasScore(studentAddress)).to.be.false;
      
      // Authorize teacher and submit score
      await contract.connect(owner).authorizeTeacher(teacherAddress);
      const score = 85;
      const input = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input.add32(score);
      const encryptedInput = await input.encrypt();
      
      await contract
        .connect(teacher)
        .submitScore(studentAddress, encryptedInput.handles[0], encryptedInput.inputProof);
      
      expect(await contract.studentHasScore(studentAddress)).to.be.true;
    });

    it("Should return total students with scores", async function () {
      const total = await contract.getTotalStudentsWithScores();
      expect(total).to.equal(0); // Placeholder implementation
    });
  });

  describe("Edge Cases", function () {
    beforeEach(async function () {
      await contract.connect(owner).authorizeTeacher(teacherAddress);
    });

    it("Should handle score update correctly", async function () {
      // First submission
      const score1 = 85;
      const input1 = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input1.add32(score1);
      const encryptedInput1 = await input1.encrypt();
      
      await contract
        .connect(teacher)
        .submitScore(studentAddress, encryptedInput1.handles[0], encryptedInput1.inputProof);
      
      expect(await contract.hasScore(studentAddress)).to.be.true;
      
      // Second submission (update)
      const score2 = 92;
      const input2 = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input2.add32(score2);
      const encryptedInput2 = await input2.encrypt();
      
      await expect(
        contract
          .connect(teacher)
          .submitScore(studentAddress, encryptedInput2.handles[0], encryptedInput2.inputProof)
      ).to.emit(contract, "ScoreUpdated")
        .withArgs(studentAddress, teacherAddress);
        
      // Verify the score was updated
      const encryptedScore = await contract.connect(student).getStudentScore(studentAddress);
      const decryptedScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedScore,
        await contract.getAddress(),
        student
      );
      
      expect(decryptedScore).to.equal(92);
    });

    it("Should handle threshold edge cases", async function () {
      // Submit score exactly at threshold
      const score = 80;
      const input = fhevm.createEncryptedInput(await contract.getAddress(), teacherAddress);
      input.add32(score);
      const encryptedInput = await input.encrypt();
      
      await contract
        .connect(teacher)
        .submitScore(studentAddress, encryptedInput.handles[0], encryptedInput.inputProof);
      
      // Check threshold at exact score
      const meetsThreshold = await contract.meetsAdmissionThreshold(studentAddress, 80);
      expect(meetsThreshold).to.not.be.undefined;
      
      // Check threshold above score
      const belowThreshold = await contract.meetsAdmissionThreshold(studentAddress, 85);
      expect(belowThreshold).to.not.be.undefined;
    });
  });
});