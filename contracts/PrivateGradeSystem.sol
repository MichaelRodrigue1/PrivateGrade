// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Private Grade System using FHE
/// @notice A system where teachers can input student scores, students can decrypt their own scores,
/// and schools can only check if scores meet admission thresholds without seeing actual scores
contract PrivateGradeSystem is SepoliaConfig {
    // Mapping from student address to their encrypted score
    mapping(address => euint32) private studentScores;

    // Mapping of authorized teachers
    mapping(address => bool) public authorizedTeachers;

    // Contract owner (can add/remove teachers)
    address public owner;

    // Events
    event TeacherAuthorized(address indexed teacher);
    event TeacherDeauthorized(address indexed teacher);
    event ScoreSubmitted(address indexed student, address indexed teacher);
    event ScoreUpdated(address indexed student, address indexed teacher);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorizedTeacher() {
        require(authorizedTeachers[msg.sender], "Only authorized teachers can submit scores");
        _;
    }

    modifier onlyStudent(address student) {
        require(msg.sender == student, "Only the student can access their own score");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedTeachers[msg.sender] = true; // Owner is initially an authorized teacher
    }

    /// @notice Authorize a teacher to submit scores
    /// @param teacher Address of the teacher to authorize
    function authorizeTeacher(address teacher) external onlyOwner {
        require(teacher != address(0), "Invalid teacher address");
        authorizedTeachers[teacher] = true;
        emit TeacherAuthorized(teacher);
    }

    /// @notice Deauthorize a teacher
    /// @param teacher Address of the teacher to deauthorize
    function deauthorizeTeacher(address teacher) external onlyOwner {
        authorizedTeachers[teacher] = false;
        emit TeacherDeauthorized(teacher);
    }

    /// @notice Submit an encrypted score for a student
    /// @param student Address of the student
    /// @param encryptedScore Encrypted score value
    /// @param inputProof Proof for the encrypted input
    function submitScore(
        address student,
        externalEuint32 encryptedScore,
        bytes calldata inputProof
    ) external onlyAuthorizedTeacher {
        require(student != address(0), "Invalid student address");

        // Convert external encrypted input to internal encrypted type
        euint32 score = FHE.fromExternal(encryptedScore, inputProof);

        // Store the encrypted score
        studentScores[student] = score;

        // Grant access permissions
        FHE.allowThis(score);
        // FHE.allow(score, msg.sender);
        FHE.allow(score, student); // Only the student can decrypt their own score
    }

    /// @notice Get encrypted score for a student (only the student themselves can call this)
    /// @param student Address of the student
    /// @return The encrypted score
    function getStudentScore(address student) external view onlyStudent(student) returns (euint32) {
        return studentScores[student];
    }

    function grantAccess(address user) external {
        FHE.allow(studentScores[msg.sender], user);
    }

    /// @notice Check if a student's score meets the admission threshold
    /// @param student Address of the student
    /// @param threshold The admission threshold to check against
    /// @return Boolean indicating if the student meets the threshold
    // function meetsAdmissionThreshold(address student, uint32 threshold) external returns (ebool) {
    //     // Convert threshold to encrypted value for comparison
    //     euint32 encryptedThreshold = FHE.asEuint32(threshold);

    //     // Return encrypted boolean result - schools cannot see the actual score
    //     // They only know if the student meets the threshold or not
    //     return FHE.ge(studentScores[student], encryptedThreshold);
    // }
}
