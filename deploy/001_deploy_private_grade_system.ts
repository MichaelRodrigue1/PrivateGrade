import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const deployPrivateGradeSystem: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const privateGradeSystem = await deploy("PrivateGradeSystem", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`PrivateGradeSystem contract: `, privateGradeSystem.address);
};

export default deployPrivateGradeSystem;

deployPrivateGradeSystem.id = "deploy_private_grade_system";
deployPrivateGradeSystem.tags = ["PrivateGradeSystem"];