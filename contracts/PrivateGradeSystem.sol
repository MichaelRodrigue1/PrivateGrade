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
    
    // Mapping from student address to whether they have a score
    mapping(address => bool) public hasScore;
    
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
        
        bool isUpdate = hasScore[student];
        
        // Store the encrypted score
        studentScores[student] = score;
        hasScore[student] = true;
        
        // Grant access permissions
        FHE.allowThis(score);
        FHE.allow(score, student); // Only the student can decrypt their own score
        
        if (isUpdate) {
            emit ScoreUpdated(student, msg.sender);
        } else {
            emit ScoreSubmitted(student, msg.sender);
        }
    }
    
    /// @notice Get encrypted score for a student (only the student themselves can call this)
    /// @param student Address of the student
    /// @return The encrypted score
    function getStudentScore(address student) external view onlyStudent(student) returns (euint32) {
        require(hasScore[student], "No score found for student");
        return studentScores[student];
    }
    
    /// @notice Check if a student's score meets the admission threshold
    /// @param student Address of the student
    /// @param threshold The admission threshold to check against
    /// @return Boolean indicating if the student meets the threshold
    function meetsAdmissionThreshold(address student, uint32 threshold) external returns (ebool) {
        require(hasScore[student], "No score found for student");
        
        // Convert threshold to encrypted value for comparison
        euint32 encryptedThreshold = FHE.asEuint32(threshold);
        
        // Return encrypted boolean result - schools cannot see the actual score
        // They only know if the student meets the threshold or not
        return FHE.ge(studentScores[student], encryptedThreshold);
    }
    
    /// @notice Batch check if multiple students meet the admission threshold
    /// @param students Array of student addresses
    /// @param threshold The admission threshold
    /// @return Array of encrypted booleans indicating threshold compliance
    function batchCheckAdmissionThreshold(
        address[] calldata students, 
        uint32 threshold
    ) external returns (ebool[] memory) {
        ebool[] memory results = new ebool[](students.length);
        euint32 encryptedThreshold = FHE.asEuint32(threshold);
        
        for (uint256 i = 0; i < students.length; i++) {
            if (hasScore[students[i]]) {
                results[i] = FHE.ge(studentScores[students[i]], encryptedThreshold);
            } else {
                // Return false for students without scores
                results[i] = FHE.asEbool(false);
            }
        }
        
        return results;
    }
    
    /// @notice Check if a student has a score recorded
    /// @param student Address of the student
    /// @return True if the student has a score, false otherwise
    function studentHasScore(address student) external view returns (bool) {
        return hasScore[student];
    }
    
    /// @notice Get the total number of students with recorded scores
    /// @return The count of students with scores
    function getTotalStudentsWithScores() external pure returns (uint256) {
        // Note: This is a simple implementation and doesn't track the actual count
        // In a production system, you might want to maintain a counter for efficiency
        return 0; // Placeholder - would need additional state tracking
    }
}